import { describe, expect, it, vi } from 'vitest'
import {
  beginDemoRequestTrace,
  demoCorsHeaders,
  demoRequestId,
  logDemoRequest,
} from './_lib/demoCors'

function request(requestId = 'mobile-request-123') {
  return new Request(
    'https://fridge-elf-app.vercel.app/api/demo/agent',
    {
      method: 'POST',
      headers: {
        origin: 'https://fridgeelf.rth1.xyz',
        'x-request-id': requestId,
      },
    },
  )
}

describe('managed demo request diagnostics', () => {
  it('accepts only bounded safe request IDs', () => {
    expect(demoRequestId(request())).toBe('mobile-request-123')
    expect(demoRequestId(request('Bearer secret token'))).toMatch(
      /^[0-9a-f-]{36}$/,
    )
  })

  it('allows, exposes, and returns request IDs through CORS', () => {
    const headers = demoCorsHeaders(request(), 'mobile-request-123')

    expect(headers?.get('access-control-allow-headers')).toContain(
      'x-request-id',
    )
    expect(headers?.get('access-control-expose-headers')).toContain(
      'x-request-id',
    )
    expect(headers?.get('x-request-id')).toBe('mobile-request-123')
  })

  it('emits content-free structured start and completion logs', () => {
    const output: string[] = []
    const info = vi
      .spyOn(console, 'log')
      .mockImplementation((line) => output.push(String(line)))
    try {
      const trace = beginDemoRequestTrace(
        request(),
        '/api/demo/agent',
        () => 1_000,
      )
      const response = trace.finish(
        Response.json({ answer: 'sensitive response' }),
      )

      expect(response.headers.get('x-request-id')).toBe(
        'mobile-request-123',
      )
      expect(output).toHaveLength(2)
      expect(output.map((line) => JSON.parse(line))).toEqual([
        {
          level: 'info',
          event: 'request_start',
          route: '/api/demo/agent',
          requestId: 'mobile-request-123',
        },
        {
          level: 'info',
          event: 'request_complete',
          route: '/api/demo/agent',
          requestId: 'mobile-request-123',
          status: 200,
          durationMs: 0,
        },
      ])
      expect(output.join(' ')).not.toContain('sensitive response')
      expect(output.join(' ')).not.toContain('authorization')
      expect(output.join(' ')).not.toContain('Bearer')
    } finally {
      info.mockRestore()
    }
  })

  it('logs only a bounded category for failures', () => {
    const output: string[] = []
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation((line) => output.push(String(line)))
    try {
      logDemoRequest({
        level: 'error',
        event: 'upstream_failure',
        route: '/api/demo/agent',
        requestId: 'mobile-request-123',
        status: 502,
        category: 'UPSTREAM_RESPONSE_INVALID',
      })

      expect(JSON.parse(output[0])).toEqual({
        level: 'error',
        event: 'upstream_failure',
        route: '/api/demo/agent',
        requestId: 'mobile-request-123',
        status: 502,
        category: 'UPSTREAM_RESPONSE_INVALID',
      })
    } finally {
      error.mockRestore()
    }
  })
})
