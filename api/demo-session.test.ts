import { describe, expect, it } from 'vitest'
import {
  handleDemoSessionRequest,
  issueDemoSession,
  verifyDemoSession,
} from './_lib/demoSession'

const secret = 'demo-session-secret-for-tests'

function request(origin: string, method = 'POST') {
  return new Request('https://fridge-elf-app.vercel.app/api/demo/session', {
    method,
    headers: {
      origin,
      'x-request-id': 'mobile-session-123',
    },
  })
}

describe('anonymous demo session', () => {
  it('issues a signed two-hour session to either public demo origin', async () => {
    const now = Date.UTC(2026, 6, 25, 12)
    const response = handleDemoSessionRequest(
      request('https://fridgeelf.rth1.xyz'),
      { DEMO_SESSION_SECRET: secret },
      now,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://fridgeelf.rth1.xyz',
    )
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-request-id')).toBe(
      'mobile-session-123',
    )
    expect(
      response.headers.get('access-control-expose-headers'),
    ).toContain('x-request-id')
    const payload = await response.json()
    expect(payload.expiresAt).toBe('2026-07-25T14:00:00.000Z')
    expect(verifyDemoSession(payload.token, secret, now)).toBe(true)
  })

  it('answers an allowed CORS preflight without issuing a session', () => {
    const response = handleDemoSessionRequest(
      request('https://fridge-elf-app.vercel.app', 'OPTIONS'),
      { DEMO_SESSION_SECRET: secret },
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-methods')).toContain(
      'POST',
    )
    expect(response.headers.get('vary')).toBe('Origin')
    expect(response.headers.get('access-control-allow-headers')).toContain(
      'x-request-id',
    )
  })

  it('rejects an unapproved browser origin', async () => {
    const response = handleDemoSessionRequest(
      request('https://attacker.example'),
      { DEMO_SESSION_SECRET: secret },
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: { code: 'ORIGIN_NOT_ALLOWED', message: '当前来源无法使用演示服务' },
    })
    expect(response.headers.has('access-control-allow-origin')).toBe(false)
  })

  it('rejects missing server configuration without exposing details', async () => {
    const response = handleDemoSessionRequest(
      request('http://127.0.0.1:5173'),
      {},
    )

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error: { code: 'DEMO_SESSION_UNAVAILABLE', message: '演示服务暂时不可用' },
    })
  })

  it('rejects tampered and expired tokens', () => {
    const now = Date.UTC(2026, 6, 25, 12)
    const session = issueDemoSession(secret, now)
    const tampered = `${session.token.slice(0, -1)}x`

    expect(verifyDemoSession(tampered, secret, now)).toBe(false)
    expect(verifyDemoSession(session.token, secret, now + 7_200_001)).toBe(
      false,
    )
  })
})
