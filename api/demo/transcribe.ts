import { demoCorsHeaders, demoJsonError } from '../_lib/demoCors.js'
import { beginDemoRequestTrace } from '../_lib/demoCors.js'
import {
  handleDemoTranscribeRequest,
  preflightDemoTranscribeRequest,
  type TranscribeDependencies,
  type TranscribeEnvironment,
} from '../_lib/transcribe.js'

export interface NodeRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
  url?: string
  aborted?: boolean
  destroyed?: boolean
  complete?: boolean
  on?: (event: string, listener: () => void) => unknown
  off?: (event: string, listener: () => void) => unknown
  removeListener?: (event: string, listener: () => void) => unknown
  destroy?: (error?: Error) => unknown
  resume?: () => unknown
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array>
}

export interface NodeTranscribeDependencies {
  bodyReadTimeoutMs?: number
  setTimeout?: (handler: () => void, delay: number) => unknown
  clearTimeout?: (handle: unknown) => void
  transcribeDependencies?: TranscribeDependencies
}

interface NodeResponse {
  status: (status: number) => NodeResponse
  setHeader: (name: string, value: string) => void
  send: (body: Buffer) => void
}

export const config = {
  api: { bodyParser: false },
  maxDuration: 300,
}

export const MAX_TRANSCRIBE_REQUEST_BYTES =
  3 * 1024 * 1024 + 256 * 1024
const BODY_READ_TIMEOUT_MS = 15_000

class RequestBodyTooLargeError extends Error {
  readonly code = 'REQUEST_BODY_TOO_LARGE'
}

class RequestBodyInterruptedError extends Error {
  readonly code = 'REQUEST_BODY_INTERRUPTED'
}

function nodeHeaders(request: NodeRequest) {
  const headers = new Headers()
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(name, value)
    else if (Array.isArray(value)) headers.set(name, value.join(', '))
  }
  return headers
}

function ensureBodySize(size: number) {
  if (size > MAX_TRANSCRIBE_REQUEST_BYTES) {
    throw new RequestBodyTooLargeError()
  }
}

async function releaseNodeRequest(
  request: NodeRequest,
  iterator?: AsyncIterator<Uint8Array>,
) {
  let released = false
  if (request.destroy) {
    try {
      request.destroy()
      released = true
    } catch {
      // Fall through to resume when destroy is unavailable at runtime.
    }
  }
  if (!released) {
    try {
      request.resume?.()
    } catch {
      // Iterator return below is the remaining best-effort release.
    }
  }
  try {
    await iterator?.return?.()
  } catch {
    // The original bounded-read error remains the public failure.
  }
}

export async function readLimitedRequestBody(
  request: NodeRequest,
  signal?: AbortSignal,
) {
  const ensureActive = () => {
    if (signal?.aborted) throw new RequestBodyInterruptedError()
  }
  ensureActive()
  const contentLength = nodeHeaders(request).get('content-length')
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > MAX_TRANSCRIBE_REQUEST_BYTES
  ) {
    await releaseNodeRequest(request)
    throw new RequestBodyTooLargeError()
  }
  if (Buffer.isBuffer(request.body)) {
    ensureActive()
    ensureBodySize(request.body.byteLength)
    return request.body
  }
  if (request.body instanceof Uint8Array) {
    ensureActive()
    ensureBodySize(request.body.byteLength)
    return Buffer.from(request.body)
  }
  if (typeof request.body === 'string') {
    ensureActive()
    const body = Buffer.from(request.body)
    ensureBodySize(body.byteLength)
    return body
  }
  if (typeof request[Symbol.asyncIterator] !== 'function') {
    return Buffer.alloc(0)
  }
  const chunks: Buffer[] = []
  let size = 0
  const iterator = (
    request as AsyncIterable<Uint8Array>
  )[Symbol.asyncIterator]()
  let completed = false
  try {
    while (true) {
      ensureActive()
      const item = signal
        ? await new Promise<IteratorResult<Uint8Array>>(
            (resolve, reject) => {
              let settled = false
              const cleanup = () => {
                signal.removeEventListener('abort', onAbort)
              }
              const settle = (
                callback: () => void,
              ) => {
                if (settled) return
                settled = true
                cleanup()
                callback()
              }
              const onAbort = () => {
                settle(() =>
                  reject(new RequestBodyInterruptedError()),
                )
              }
              signal.addEventListener('abort', onAbort, { once: true })
              if (signal.aborted) {
                onAbort()
                return
              }
              iterator.next().then(
                (value) => settle(() => resolve(value)),
                (error) => settle(() => reject(error)),
              )
            },
          )
        : await iterator.next()
      if (item.done) {
        completed = true
        break
      }
      const buffer = Buffer.from(item.value)
      size += buffer.byteLength
      ensureBodySize(size)
      chunks.push(buffer)
    }
  } finally {
    if (!completed) {
      await releaseNodeRequest(request, iterator)
    }
  }
  return Buffer.concat(chunks, size)
}

function nodeRequestAborted(request: NodeRequest) {
  return (
    request.aborted === true ||
    (request.destroyed === true && request.complete !== true)
  )
}

export function bridgeNodeRequestAbort(request: NodeRequest) {
  const controller = new AbortController()
  const onAborted = () => controller.abort()
  const onClose = () => {
    // IncomingMessage can emit close after a complete request; only an
    // incomplete destroyed request represents a client disconnect.
    if (nodeRequestAborted(request)) controller.abort()
  }
  if (nodeRequestAborted(request)) controller.abort()
  request.on?.('aborted', onAborted)
  request.on?.('close', onClose)
  return {
    signal: controller.signal,
    cleanup() {
      const remove = request.off ?? request.removeListener
      remove?.call(request, 'aborted', onAborted)
      remove?.call(request, 'close', onClose)
    },
  }
}

export async function handleTranscribeNodeRequest(
  request: NodeRequest,
  environment: TranscribeEnvironment,
  dependencies: NodeTranscribeDependencies = {},
) {
  const headers = nodeHeaders(request)
  const method = request.method ?? 'GET'
  const url = new URL(
    request.url ?? '/api/demo/transcribe',
    'https://demo.local',
  )
  const trace = beginDemoRequestTrace(
    new Request(url, { method, headers }),
    '/api/demo/transcribe',
  )
  try {
    const response = await handleTranscribeNodeRequestCore(
      request,
      environment,
      dependencies,
    )
    if (response.status >= 500) {
      trace.upstreamFailure('UPSTREAM_TRANSCRIPTION_FAILED', response.status)
    }
    return trace.finish(response)
  } catch {
    trace.failed('UNHANDLED_SERVER_ERROR')
    throw new Error('Demo transcription request failed')
  }
}

async function handleTranscribeNodeRequestCore(
  request: NodeRequest,
  environment: TranscribeEnvironment,
  dependencies: NodeTranscribeDependencies,
) {
  const headers = nodeHeaders(request)
  const method = request.method ?? 'GET'
  const url = new URL(
    request.url ?? '/api/demo/transcribe',
    'https://demo.local',
  )
  const headerOnlyRequest = new Request(url, { method, headers })
  const preflight = preflightDemoTranscribeRequest(
    headerOnlyRequest,
    environment,
  )
  if (preflight) return preflight

  const client = bridgeNodeRequestAbort(request)
  try {
    if (client.signal.aborted) {
      return demoJsonError(
        408,
        'REQUEST_TIMEOUT',
        '音频上传超时，请重试',
        demoCorsHeaders(headerOnlyRequest)!,
      )
    }
    const bodyDeadline = new AbortController()
    const schedule =
      dependencies.setTimeout ??
      ((handler: () => void, delay: number) =>
        globalThis.setTimeout(handler, delay))
    const cancel =
      dependencies.clearTimeout ??
      ((handle: unknown) =>
        globalThis.clearTimeout(
          handle as ReturnType<typeof globalThis.setTimeout>,
        ))
    const timer = schedule(
      () => bodyDeadline.abort(),
      dependencies.bodyReadTimeoutMs ?? BODY_READ_TIMEOUT_MS,
    )
    let body: Buffer
    try {
      body = await readLimitedRequestBody(
        request,
        AbortSignal.any([
          client.signal,
          bodyDeadline.signal,
        ]),
      )
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return demoJsonError(
          413,
          'AUDIO_TOO_LARGE',
          '音频不能超过 3 MB',
          demoCorsHeaders(headerOnlyRequest)!,
        )
      }
      if (error instanceof RequestBodyInterruptedError) {
        return demoJsonError(
          408,
          'REQUEST_TIMEOUT',
          '音频上传超时，请重试',
          demoCorsHeaders(headerOnlyRequest)!,
        )
      }
      throw error
    } finally {
      cancel(timer)
    }

    return await handleDemoTranscribeRequest(
      new Request(url, {
        method,
        headers,
        body: new Uint8Array(body),
        signal: client.signal,
      }),
      environment,
      dependencies.transcribeDependencies,
    )
  } finally {
    client.cleanup()
  }
}

export default async function handler(
  request: NodeRequest,
  response: NodeResponse,
) {
  const webResponse = await handleTranscribeNodeRequest(
    request,
    process.env,
  )
  response.status(webResponse.status)
  webResponse.headers.forEach((value, name) => {
    response.setHeader(name, value)
  })
  response.send(Buffer.from(await webResponse.arrayBuffer()))
}
