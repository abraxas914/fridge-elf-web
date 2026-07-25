import type {
  DemoAgentInput,
  DemoAgentResponse,
} from './types'
import type { RecipeIllustrationRequestV1 } from '../illustration/recipePlan'

const RETINBOX_HOST = 'fridgeelf.rth1.xyz'
const VERCEL_BFF_ORIGIN = 'https://fridge-elf-app.vercel.app'
const SESSION_STORAGE_KEY = 'fridge-elf-demo-session-v1'
const REQUEST_TIMEOUT_MS = 50_000

interface LocationLike {
  hostname: string
  origin: string
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
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
  ) {
    super('Demo AI service unavailable')
    this.name = 'DemoApiError'
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
  const fetcher = options.fetcher ?? fetch
  const storage = options.storage ?? browserStorage()
  const location = options.location ?? browserLocation()
  const now = options.now?.() ?? Date.now()
  const stored = readStoredSession(storage, now)
  if (stored) return stored.token

  try {
    const response = await fetcher(
      demoApiUrl('/api/demo/session', location),
      {
        method: 'POST',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    )
    if (!response.ok) {
      throw new DemoApiError('DEMO_SESSION_UNAVAILABLE', response.status)
    }
    const payload = (await response.json()) as Partial<StoredSession>
    if (
      typeof payload.token !== 'string' ||
      payload.token.length === 0 ||
      typeof payload.expiresAt !== 'string' ||
      !Number.isFinite(Date.parse(payload.expiresAt))
    ) {
      throw new DemoApiError('DEMO_SESSION_UNAVAILABLE')
    }
    const session = {
      token: payload.token,
      expiresAt: payload.expiresAt,
    }
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    return session.token
  } catch (error) {
    if (error instanceof DemoApiError) throw error
    throw new DemoApiError('DEMO_SESSION_UNAVAILABLE')
  }
}

function isDemoAgentResponse(value: unknown): value is DemoAgentResponse {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { answer?: unknown }).answer === 'string'
  )
}

export async function requestDemoAgent(
  input: DemoAgentInput,
  options: DemoRequestOptions = {},
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

  try {
    const response = await fetcher(demoApiUrl(path, location), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new DemoApiError(
        response.status === 429 ? 'DEMO_RATE_LIMITED' : 'AGENT_UNAVAILABLE',
        response.status,
      )
    }
    const payload: unknown = await response.json()
    if (!isDemoAgentResponse(payload)) {
      throw new DemoApiError('AGENT_UNAVAILABLE')
    }
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

  try {
    const response = await fetcher(
      demoApiUrl('/api/illustrate', location),
      {
        method: 'POST',
        headers: {
          accept: 'image/png',
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    )
    if (!response.ok) {
      throw new DemoApiError(
        response.status === 429
          ? 'DEMO_RATE_LIMITED'
          : 'IMAGE_UNAVAILABLE',
        response.status,
      )
    }
    if (response.headers.get('content-type') !== 'image/png') {
      throw new DemoApiError('IMAGE_UNAVAILABLE')
    }
    return await response.blob()
  } catch (error) {
    if (error instanceof DemoApiError) throw error
    throw new DemoApiError('IMAGE_UNAVAILABLE')
  }
}
