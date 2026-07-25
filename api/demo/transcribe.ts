import { demoCorsHeaders, demoJsonError } from '../_lib/demoCors.js'
import {
  handleDemoTranscribeRequest,
  preflightDemoTranscribeRequest,
  type TranscribeEnvironment,
} from '../_lib/transcribe.js'

export interface NodeRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
  url?: string
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array>
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

class RequestBodyTooLargeError extends Error {
  readonly code = 'REQUEST_BODY_TOO_LARGE'
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

export async function readLimitedRequestBody(request: NodeRequest) {
  const contentLength = nodeHeaders(request).get('content-length')
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > MAX_TRANSCRIBE_REQUEST_BYTES
  ) {
    throw new RequestBodyTooLargeError()
  }
  if (Buffer.isBuffer(request.body)) {
    ensureBodySize(request.body.byteLength)
    return request.body
  }
  if (request.body instanceof Uint8Array) {
    ensureBodySize(request.body.byteLength)
    return Buffer.from(request.body)
  }
  if (typeof request.body === 'string') {
    const body = Buffer.from(request.body)
    ensureBodySize(body.byteLength)
    return body
  }
  if (typeof request[Symbol.asyncIterator] !== 'function') {
    return Buffer.alloc(0)
  }
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request as AsyncIterable<Uint8Array>) {
    const buffer = Buffer.from(chunk)
    size += buffer.byteLength
    ensureBodySize(size)
    chunks.push(buffer)
  }
  return Buffer.concat(chunks, size)
}

export async function handleTranscribeNodeRequest(
  request: NodeRequest,
  environment: TranscribeEnvironment,
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

  let body: Buffer
  try {
    body = await readLimitedRequestBody(request)
  } catch (error) {
    if (!(error instanceof RequestBodyTooLargeError)) throw error
    return demoJsonError(
      413,
      'AUDIO_TOO_LARGE',
      '音频不能超过 3 MB',
      demoCorsHeaders(headerOnlyRequest)!,
    )
  }

  return handleDemoTranscribeRequest(
    new Request(url, {
      method,
      headers,
      body: new Uint8Array(body),
    }),
    environment,
  )
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
