import { randomUUID } from 'node:crypto'

const ALLOWED_ORIGINS = new Set([
  'https://fridge-elf-app.vercel.app',
  'https://fridgeelf.rth1.xyz',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
])

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/

export function demoRequestId(request: Request) {
  const supplied = request.headers.get('x-request-id')?.trim() ?? ''
  return REQUEST_ID_PATTERN.test(supplied)
    ? supplied
    : randomUUID()
}

export function demoCorsHeaders(
  request: Request,
  requestId = demoRequestId(request),
) {
  const origin = request.headers.get('origin')
  if (origin && !ALLOWED_ORIGINS.has(origin)) return null

  const headers = new Headers({
    'access-control-allow-headers':
      'authorization, content-type, x-request-id',
    'access-control-expose-headers': 'x-request-id, retry-after',
    'access-control-allow-methods': 'POST, OPTIONS',
    'cache-control': 'no-store',
    vary: 'Origin',
    'x-request-id': requestId,
  })
  if (origin) headers.set('access-control-allow-origin', origin)
  return headers
}

export interface DemoRequestLog {
  level: 'info' | 'error'
  event:
    | 'request_start'
    | 'request_complete'
    | 'request_failed'
    | 'upstream_failure'
  route: string
  requestId: string
  status?: number
  durationMs?: number
  category?: string
}

export function logDemoRequest(entry: DemoRequestLog) {
  const output = JSON.stringify(entry)
  if (entry.level === 'error') console.error(output)
  else console.log(output)
}

export function beginDemoRequestTrace(
  request: Request,
  route: string,
  now: () => number = () => Date.now(),
) {
  const requestId = demoRequestId(request)
  const startedAt = now()
  logDemoRequest({
    level: 'info',
    event: 'request_start',
    route,
    requestId,
  })
  return {
    requestId,
    finish(response: Response) {
      response.headers.set('x-request-id', requestId)
      logDemoRequest({
        level: 'info',
        event: 'request_complete',
        route,
        requestId,
        status: response.status,
        durationMs: Math.max(0, now() - startedAt),
      })
      return response
    },
    upstreamFailure(category: string, status?: number) {
      logDemoRequest({
        level: 'error',
        event: 'upstream_failure',
        route,
        requestId,
        ...(status === undefined ? {} : { status }),
        category,
      })
    },
    failed(category: string) {
      logDemoRequest({
        level: 'error',
        event: 'request_failed',
        route,
        requestId,
        durationMs: Math.max(0, now() - startedAt),
        category,
      })
    },
  }
}

export function demoJsonError(
  status: number,
  code: string,
  message: string,
  headers: Headers = new Headers({ 'cache-control': 'no-store' }),
) {
  return Response.json(
    { error: { code, message } },
    { status, headers },
  )
}
