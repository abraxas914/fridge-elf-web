import type {
  DemoAgentInput,
  DemoAgentResponse,
} from './types'
import type { RecipeIllustrationRequestV1 } from '../illustration/recipePlan'
import {
  beginNetworkRequest,
  createTimeoutSignal,
  isSafeNetworkRequestId,
  type NetworkOperation,
} from '../diagnostics/networkDiagnostics'

const RETINBOX_HOST = 'fridgeelf.rth1.xyz'
const VERCEL_BFF_ORIGIN = 'https://fridge-elf-app.vercel.app'
const SESSION_STORAGE_KEY = 'fridge-elf-demo-session-v1'
const REQUEST_TIMEOUT_MS = 50_000
const TRANSCRIPTION_TIMEOUT_MS = 135_000
const MAX_TRANSCRIPTION_LENGTH = 2_000

interface LocationLike {
  hostname: string
  origin: string
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

export interface DemoRequestOptions {
  fetcher?: Fetcher
  storage?: StorageLike
  location?: LocationLike
  now?: () => number
}

export type DemoIllustrationInput = RecipeIllustrationRequestV1

interface StoredSession {
  token: string
  expiresAt: string
}

export class DemoApiError extends Error {
  constructor(
    readonly code: string,
    readonly status = 0,
    readonly requestId = '',
  ) {
    super('Demo AI service unavailable')
    this.name = 'DemoApiError'
  }
}

const PUBLIC_ERROR_CODES = new Set([
  'DEMO_SESSION_UNAVAILABLE',
  'DEMO_SESSION_REQUIRED',
  'DEMO_RATE_LIMITED',
  'AGENT_UNAVAILABLE',
  'TRANSCRIPTION_UNAVAILABLE',
  'IMAGE_UNAVAILABLE',
  'TIMEOUT',
  'NETWORK_ERROR',
  'ABORTED',
  'RESPONSE_INVALID',
])

function responseRequestId(
  response: Response,
  fallback: string,
) {
  const requestId = response.headers?.get?.('x-request-id') ?? ''
  return isSafeNetworkRequestId(requestId) ? requestId : fallback
}

async function responseErrorCode(
  response: Response,
  fallback: string,
) {
  try {
    const payload = await response.json() as {
      error?: { code?: unknown }
    }
    const code = payload?.error?.code
    return typeof code === 'string' && PUBLIC_ERROR_CODES.has(code)
      ? code
      : fallback
  } catch {
    return fallback
  }
}

function browserFailureCode(
  error: unknown,
  timedOut: boolean,
) {
  if (timedOut) return 'TIMEOUT'
  if (
    error instanceof DOMException &&
    error.name === 'AbortError'
  ) {
    return 'ABORTED'
  }
  return 'NETWORK_ERROR'
}

async function managedFetch(
  operation: NetworkOperation,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  fetcher: Fetcher,
) {
  const trace = beginNetworkRequest(operation, url)
  const timeout = createTimeoutSignal(timeoutMs)
  const headers = Object.fromEntries(new Headers(init.headers))
  headers['x-request-id'] = trace.requestId
  try {
    const response = await fetcher(url, {
      ...init,
      headers,
      signal: timeout.signal,
    })
    trace.response(response.status)
    return { response, trace }
  } catch (error) {
    const code = browserFailureCode(error, timeout.didTimeout())
    trace.failure(code)
    throw new DemoApiError(code, 0, trace.requestId)
  } finally {
    timeout.dispose()
  }
}

function browserLocation(): LocationLike {
  return window.location
}

function browserStorage(): StorageLike {
  return window.sessionStorage
}

export function demoApiUrl(
  path: string,
  location: LocationLike = browserLocation(),
) {
  return location.hostname === RETINBOX_HOST
    ? `${VERCEL_BFF_ORIGIN}${path}`
    : path
}

function readStoredSession(
  storage: StorageLike,
  now: number,
): StoredSession | null {
  const raw = storage.getItem(SESSION_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>
    const expires = Date.parse(parsed.expiresAt ?? '')
    if (
      typeof parsed.token === 'string' &&
      parsed.token.length > 0 &&
      Number.isFinite(expires) &&
      expires > now + 30_000
    ) {
      return { token: parsed.token, expiresAt: parsed.expiresAt! }
    }
  } catch {
    return null
  }
  return null
}

export async function getDemoSession(
  options: DemoRequestOptions = {},
) {
  const storage = options.storage ?? browserStorage()
  const now = options.now?.() ?? Date.now()
  const stored = readStoredSession(storage, now)
  if (stored) return stored.token
  const session = await requestFreshDemoSession(options)
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  return session.token
}

async function requestFreshDemoSession(
  options: DemoRequestOptions = {},
) {
  const fetcher = options.fetcher ?? fetch
  const location = options.location ?? browserLocation()
  const url = demoApiUrl('/api/demo/session', location)
  try {
    const { response, trace } = await managedFetch(
      'session',
      url,
      {
        method: 'POST',
        headers: { accept: 'application/json' },
      },
      REQUEST_TIMEOUT_MS,
      fetcher,
    )
    if (!response.ok) {
      const code = await responseErrorCode(
        response,
        'DEMO_SESSION_UNAVAILABLE',
      )
      trace.failure(code, response.status)
      throw new DemoApiError(
        code,
        response.status,
        responseRequestId(response, trace.requestId),
      )
    }
    trace.parse()
    let payload: Partial<StoredSession>
    try {
      payload = (await response.json()) as Partial<StoredSession>
    } catch {
      trace.failure('RESPONSE_INVALID', response.status)
      throw new DemoApiError(
        'RESPONSE_INVALID',
        response.status,
        responseRequestId(response, trace.requestId),
      )
    }
    if (
      typeof payload.token !== 'string' ||
      payload.token.length === 0 ||
      typeof payload.expiresAt !== 'string' ||
      !Number.isFinite(Date.parse(payload.expiresAt))
    ) {
      trace.failure('RESPONSE_INVALID', response.status)
      throw new DemoApiError(
        'RESPONSE_INVALID',
        response.status,
        responseRequestId(response, trace.requestId),
      )
    }
    trace.success(response.status)
    return {
      token: payload.token,
      expiresAt: payload.expiresAt,
    }
  } catch (error) {
    if (error instanceof DemoApiError) throw error
    throw new DemoApiError('DEMO_SESSION_UNAVAILABLE', 0)
  }
}

export async function probeDemoSession(
  options: DemoRequestOptions = {},
) {
  await requestFreshDemoSession(options)
  return { ok: true as const, status: 200 }
}

function isDemoAgentResponse(value: unknown): value is DemoAgentResponse {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { answer?: unknown }).answer === 'string'
  )
}

function audioFilename(audio: Blob) {
  const mimeType = audio.type
    .split(';', 1)[0]
    .trim()
    .toLowerCase()
  const extension = new Map([
    ['audio/webm', 'webm'],
    ['audio/ogg', 'ogg'],
    ['audio/mp4', 'mp4'],
    ['audio/wav', 'wav'],
    ['audio/mpeg', 'mp3'],
  ]).get(mimeType) ?? 'webm'
  return `voice.${extension}`
}

function transcriptionText(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const raw = (value as { text?: unknown }).text
  if (typeof raw !== 'string') return null
  const text = raw.trim()
  return text ? text.slice(0, MAX_TRANSCRIPTION_LENGTH) : null
}

export async function requestDemoAgent(
  input: DemoAgentInput,
  options: DemoRequestOptions = {},
) {
  return requestDemoAgentWithSessionRetry(input, options, true)
}

function clearStoredSession(storage: StorageLike) {
  if (storage.removeItem) storage.removeItem(SESSION_STORAGE_KEY)
  else storage.setItem(SESSION_STORAGE_KEY, '')
}

async function requestDemoAgentWithSessionRetry(
  input: DemoAgentInput,
  options: DemoRequestOptions,
  allowSessionRetry: boolean,
) {
  const fetcher = options.fetcher ?? fetch
  const location = options.location ?? browserLocation()
  const token = await getDemoSession(options)
  const path =
    input.mode === 'agent'
      ? '/api/demo/agent'
      : '/api/demo/recommend'
  const body =
    input.mode === 'agent'
      ? {
          message: input.message?.trim() || '今晚吃什么？',
          snapshot: input.snapshot,
        }
      : { snapshot: input.snapshot }
  const operation = input.mode === 'agent' ? 'agent' : 'recommend'
  const url = demoApiUrl(path, location)

  try {
    const { response, trace } = await managedFetch(
      operation,
      url,
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      REQUEST_TIMEOUT_MS,
      fetcher,
    )
    if (!response.ok) {
      const fallback =
        response.status === 429
          ? 'DEMO_RATE_LIMITED'
          : response.status === 401
            ? 'DEMO_SESSION_REQUIRED'
            : 'AGENT_UNAVAILABLE'
      const code = await responseErrorCode(response, fallback)
      trace.failure(code, response.status)
      if (response.status === 401 && allowSessionRetry) {
        clearStoredSession(options.storage ?? browserStorage())
        return requestDemoAgentWithSessionRetry(
          input,
          options,
          false,
        )
      }
      throw new DemoApiError(
        code,
        response.status,
        responseRequestId(response, trace.requestId),
      )
    }
    trace.parse()
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    if (!isDemoAgentResponse(payload)) {
      trace.failure('RESPONSE_INVALID', response.status)
      throw new DemoApiError(
        'RESPONSE_INVALID',
        response.status,
        responseRequestId(response, trace.requestId),
      )
    }
    trace.success(response.status)
    return payload
  } catch (error) {
    if (error instanceof DemoApiError) throw error
    throw new DemoApiError('AGENT_UNAVAILABLE')
  }
}

export async function requestDemoIllustration(
  input: DemoIllustrationInput,
  options: DemoRequestOptions = {},
) {
  const fetcher = options.fetcher ?? fetch
  const location = options.location ?? browserLocation()
  const token = await getDemoSession(options)
  const url = demoApiUrl('/api/illustrate', location)

  try {
    const { response, trace } = await managedFetch(
      'illustrate',
      url,
      {
        method: 'POST',
        headers: {
          accept: 'image/png',
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(input),
      },
      REQUEST_TIMEOUT_MS,
      fetcher,
    )
    if (!response.ok) {
      const fallback =
        response.status === 429
          ? 'DEMO_RATE_LIMITED'
          : 'IMAGE_UNAVAILABLE'
      const code = await responseErrorCode(response, fallback)
      trace.failure(code, response.status)
      throw new DemoApiError(
        code,
        response.status,
        responseRequestId(response, trace.requestId),
      )
    }
    if (response.headers.get('content-type') !== 'image/png') {
      trace.failure('RESPONSE_INVALID', response.status)
      throw new DemoApiError(
        'RESPONSE_INVALID',
        response.status,
        responseRequestId(response, trace.requestId),
      )
    }
    trace.parse()
    const blob = await response.blob()
    trace.success(response.status)
    return blob
  } catch (error) {
    if (error instanceof DemoApiError) throw error
    throw new DemoApiError('IMAGE_UNAVAILABLE')
  }
}

export async function requestDemoTranscription(
  audio: Blob,
  options: DemoRequestOptions = {},
) {
  const fetcher = options.fetcher ?? fetch
  const location = options.location ?? browserLocation()
  const token = await getDemoSession(options)
  const body = new FormData()
  body.append('audio', audio, audioFilename(audio))
  const url = demoApiUrl('/api/demo/transcribe', location)

  try {
    const { response, trace } = await managedFetch(
      'transcribe',
      url,
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
        },
        body,
      },
      TRANSCRIPTION_TIMEOUT_MS,
      fetcher,
    )
    if (!response.ok) {
      const fallback =
        response.status === 429
          ? 'DEMO_RATE_LIMITED'
          : 'TRANSCRIPTION_UNAVAILABLE'
      const code = await responseErrorCode(response, fallback)
      trace.failure(code, response.status)
      throw new DemoApiError(
        code,
        response.status,
        responseRequestId(response, trace.requestId),
      )
    }
    trace.parse()
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    const text = transcriptionText(payload)
    if (!text) {
      trace.failure('RESPONSE_INVALID', response.status)
      throw new DemoApiError(
        'RESPONSE_INVALID',
        response.status,
        responseRequestId(response, trace.requestId),
      )
    }
    trace.success(response.status)
    return text
  } catch (error) {
    if (error instanceof DemoApiError) throw error
    throw new DemoApiError('TRANSCRIPTION_UNAVAILABLE')
  }
}
