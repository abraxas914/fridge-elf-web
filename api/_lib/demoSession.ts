import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto'
import { demoCorsHeaders, demoJsonError } from './demoCors.js'

export interface DemoEnvironment {
  DEMO_SESSION_SECRET?: string
}

export interface DemoSession {
  token: string
  expiresAt: string
}

const SESSION_VERSION = 'v1'
const SESSION_TTL_MS = 2 * 60 * 60 * 1_000

function signature(secret: string, payload: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function issueDemoSession(
  secret: string,
  now = Date.now(),
): DemoSession {
  const expiresAtMilliseconds = now + SESSION_TTL_MS
  const expires = String(Math.floor(expiresAtMilliseconds / 1_000))
  const sessionId = randomUUID()
  const payload = `${SESSION_VERSION}.${expires}.${sessionId}`
  return {
    token: `${payload}.${signature(secret, payload)}`,
    expiresAt: new Date(expiresAtMilliseconds).toISOString(),
  }
}

export function verifyDemoSession(
  token: string,
  secret: string,
  now = Date.now(),
) {
  const [version, expires, sessionId, supplied, ...extra] = token.split('.')
  if (
    version !== SESSION_VERSION ||
    !/^\d+$/.test(expires ?? '') ||
    !/^[0-9a-f-]{36}$/i.test(sessionId ?? '') ||
    !supplied ||
    extra.length > 0
  ) {
    return false
  }
  if (Number(expires) <= Math.floor(now / 1_000)) return false

  const payload = `${version}.${expires}.${sessionId}`
  const expected = Buffer.from(signature(secret, payload))
  const candidate = Buffer.from(supplied)
  return (
    expected.length === candidate.length &&
    timingSafeEqual(expected, candidate)
  )
}

export function handleDemoSessionRequest(
  request: Request,
  environment: DemoEnvironment,
  now = Date.now(),
) {
  const cors = demoCorsHeaders(request)
  if (!cors) {
    return demoJsonError(
      403,
      'ORIGIN_NOT_ALLOWED',
      '当前来源无法使用演示服务',
    )
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (request.method !== 'POST') {
    return demoJsonError(405, 'METHOD_NOT_ALLOWED', '仅支持 POST 请求', cors)
  }

  const secret = environment.DEMO_SESSION_SECRET
  if (!secret || secret.length < 16) {
    return demoJsonError(
      503,
      'DEMO_SESSION_UNAVAILABLE',
      '演示服务暂时不可用',
      cors,
    )
  }
  return Response.json(issueDemoSession(secret, now), {
    headers: cors,
  })
}
