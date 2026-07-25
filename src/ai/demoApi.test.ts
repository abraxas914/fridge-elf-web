import { afterEach, describe, expect, it, vi } from 'vitest'
import { networkDiagnostics } from '../diagnostics/networkDiagnostics'
import {
  demoApiUrl,
  getDemoSession,
  probeDemoSession,
  requestDemoAgent,
  requestDemoIllustration,
  requestDemoTranscription,
} from './demoApi'
import type { DemoWorldSnapshot } from './types'

const locationFor = (origin: string) => {
  const url = new URL(origin)
  return { hostname: url.hostname, origin: url.origin }
}

const snapshot: DemoWorldSnapshot = {
  contextVersion: 2,
  inventory: [],
  plannedMeals: [],
  missingItems: [],
  availableRecipes: [],
  preferences: {
    living: 'solo',
    taste: 'clean',
    fitness: 'balance',
    routine: 'normal',
    health: '',
  },
  contextMeta: {
    contextVersion: 2,
    serializedBytes: 238,
    inventoryCount: 0,
    plannedMealCount: 0,
    missingItemCount: 0,
    recipeCount: 0,
    truncated: false,
    omittedCount: 0,
  },
}

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('browser demo agent API', () => {
  afterEach(() => {
    networkDiagnostics.clear()
    window.history.replaceState({}, '', '/')
  })

  it('uses same-origin APIs on Vercel and local development', () => {
    expect(
      demoApiUrl('/api/demo/session', locationFor('https://fridge-elf-app.vercel.app')),
    ).toBe('/api/demo/session')
    expect(
      demoApiUrl('/api/demo/session', locationFor('http://127.0.0.1:5173')),
    ).toBe('/api/demo/session')
  })

  it('uses the Vercel BFF from the static Retinbox deployment', () => {
    expect(
      demoApiUrl('/api/demo/agent', locationFor('https://fridgeelf.rth1.xyz')),
    ).toBe('https://fridge-elf-app.vercel.app/api/demo/agent')
  })

  it('stores and reuses a non-expired anonymous session', async () => {
    const storage = memoryStorage()
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        token: 'opaque-session-token',
        expiresAt: '2026-07-25T14:00:00.000Z',
      }),
    )
    const options = {
      fetcher,
      storage,
      location: locationFor('https://fridgeelf.rth1.xyz'),
      now: () => Date.UTC(2026, 6, 25, 12),
    }

    await expect(getDemoSession(options)).resolves.toBe(
      'opaque-session-token',
    )
    await expect(getDemoSession(options)).resolves.toBe(
      'opaque-session-token',
    )
    expect(fetcher).toHaveBeenCalledOnce()
    expect(fetcher).toHaveBeenCalledWith(
      'https://fridge-elf-app.vercel.app/api/demo/session',
      expect.objectContaining({ method: 'POST' }),
    )
    const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers)
    expect(headers.get('x-request-id')).toMatch(
      /^[A-Za-z0-9_-]{8,80}$/,
    )
  })

  it('probes a fresh session without returning or storing its token', async () => {
    const storage = memoryStorage()
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        token: 'probe-only-token',
        expiresAt: '2026-07-25T14:00:00.000Z',
      }),
    )

    await expect(
      probeDemoSession({
        fetcher,
        storage,
        location: locationFor('https://fridgeelf.rth1.xyz'),
        now: () => Date.UTC(2026, 6, 25, 12),
      }),
    ).resolves.toEqual({ ok: true, status: 200 })
    expect(storage.getItem('fridge-elf-demo-session-v1')).toBeNull()
  })

  it('calls Agent with the anonymous bearer token and bounded snapshot', async () => {
    const storage = memoryStorage()
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          token: 'opaque-session-token',
          expiresAt: '2026-07-25T14:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          answer: '先吃番茄。',
          suggestions: [],
        }),
      )

    const response = await requestDemoAgent(
      { mode: 'agent', message: '今晚吃什么？', snapshot },
      {
        fetcher,
        storage,
        location: locationFor('https://fridgeelf.rth1.xyz'),
        now: () => Date.UTC(2026, 6, 25, 12),
      },
    )

    expect(response.answer).toBe('先吃番茄。')
    const [url, init] = fetcher.mock.calls[1]
    expect(url).toBe(
      'https://fridge-elf-app.vercel.app/api/demo/agent',
    )
    expect(init.headers.authorization).toBe(
      'Bearer opaque-session-token',
    )
    expect(new Headers(init.headers).get('x-request-id')).toMatch(
      /^[A-Za-z0-9_-]{8,80}$/,
    )
    expect(JSON.parse(init.body)).toEqual({
      message: '今晚吃什么？',
      snapshot,
    })
  })

  it('calls the Vercel image BFF from Retinbox with the same session', async () => {
    const storage = memoryStorage()
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          token: 'opaque-session-token',
          expiresAt: '2026-07-25T14:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([137, 80, 78, 71]), {
          headers: { 'content-type': 'image/png' },
        }),
      )

    const blob = await requestDemoIllustration(
      {
        contractVersion: 1,
        recipe: {
          id: 'demo-tomato',
          title: '番茄小菜',
          ingredients: [{ name: '番茄' }],
          steps: [{ order: 1, action: '切块。' }],
        },
        styleId: 'xiaohei',
        pageIndexes: [1],
      },
      {
        fetcher,
        storage,
        location: locationFor('https://fridgeelf.rth1.xyz'),
        now: () => Date.UTC(2026, 6, 25, 12),
      },
    )

    expect(blob.type).toBe('image/png')
    const [url, init] = fetcher.mock.calls[1]
    expect(url).toBe(
      'https://fridge-elf-app.vercel.app/api/illustrate',
    )
    expect(init.headers.authorization).toBe(
      'Bearer opaque-session-token',
    )
    expect(JSON.parse(init.body).styleId).toBe('xiaohei')
  })

  it.each([
    [
      'https://fridge-elf-app.vercel.app',
      '/api/demo/transcribe',
    ],
    [
      'https://fridgeelf.rth1.xyz',
      'https://fridge-elf-app.vercel.app/api/demo/transcribe',
    ],
  ])(
    'uploads browser audio through the managed BFF from %s',
    async (pageOrigin, expectedUrl) => {
      const storage = memoryStorage()
      const fetcher = vi.fn()
        .mockResolvedValueOnce(
          Response.json({
            token: 'opaque-session-token',
            expiresAt: '2026-07-25T14:00:00.000Z',
          }),
        )
        .mockResolvedValueOnce(
          Response.json({
            text: `  ${'声'.repeat(2_100)}  `,
          }),
        )

      const text = await requestDemoTranscription(
        new Blob(['voice'], {
          type: 'audio/webm;codecs=opus',
        }),
        {
          fetcher,
          storage,
          location: locationFor(pageOrigin),
          now: () => Date.UTC(2026, 6, 25, 12),
        },
      )

      expect(text).toBe('声'.repeat(2_000))
      const [url, init] = fetcher.mock.calls[1]
      expect(url).toBe(expectedUrl)
      expect(init.method).toBe('POST')
      const headers = new Headers(init.headers)
      expect(headers.get('accept')).toBe('application/json')
      expect(headers.get('authorization')).toBe(
        'Bearer opaque-session-token',
      )
      expect(headers.has('content-type')).toBe(false)
      expect(init.body).toBeInstanceOf(FormData)
      const uploaded = (init.body as FormData).get('audio')
      expect(uploaded).toBeInstanceOf(File)
      expect((uploaded as File).name).toBe('voice.webm')
      expect((uploaded as File).type).toBe(
        'audio/webm;codecs=opus',
      )
      expect(init.signal).toBeInstanceOf(AbortSignal)
    },
  )

  it('reuses one anonymous session across transcription requests', async () => {
    const storage = memoryStorage()
    const fetcher = vi.fn()
      .mockResolvedValueOnce(
        Response.json({
          token: 'opaque-session-token',
          expiresAt: '2026-07-25T14:00:00.000Z',
        }),
      )
      .mockImplementation(
        async () => Response.json({ text: '买两盒牛奶' }),
      )
    const options = {
      fetcher,
      storage,
      location: locationFor('https://fridgeelf.rth1.xyz'),
      now: () => Date.UTC(2026, 6, 25, 12),
    }

    await requestDemoTranscription(
      new Blob(['one'], { type: 'audio/ogg' }),
      options,
    )
    await requestDemoTranscription(
      new Blob(['two'], { type: 'audio/mp4' }),
      options,
    )

    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(fetcher.mock.calls[0]?.[0]).toContain('/api/demo/session')
    expect(fetcher.mock.calls[1]?.[0]).toContain(
      '/api/demo/transcribe',
    )
    expect(fetcher.mock.calls[2]?.[0]).toContain(
      '/api/demo/transcribe',
    )
  })

  it.each([
    [429, 'DEMO_RATE_LIMITED'],
    [502, 'TRANSCRIPTION_UNAVAILABLE'],
  ])(
    'maps transcription HTTP %s without exposing server details',
    async (status, code) => {
      const storage = memoryStorage()
      const json = vi.fn().mockResolvedValue({
        error: { code, message: 'provider secret' },
      })
      const fetcher = vi.fn()
        .mockResolvedValueOnce(
          Response.json({
            token: 'opaque-session-token',
            expiresAt: '2026-07-25T14:00:00.000Z',
          }),
        )
        .mockResolvedValueOnce({
          ok: false,
          status,
          json,
        })

      await expect(
        requestDemoTranscription(
          new Blob(['voice'], { type: 'audio/ogg' }),
          {
            fetcher,
            storage,
            location: locationFor(
              'https://fridge-elf-app.vercel.app',
            ),
            now: () => Date.UTC(2026, 6, 25, 12),
          },
        ),
      ).rejects.toMatchObject({
        name: 'DemoApiError',
        code,
        status,
        message: 'Demo AI service unavailable',
      })
      expect(json).toHaveBeenCalledOnce()
    },
  )

  it.each([
    Response.json({ text: '' }),
    Response.json({ text: 42 }),
    Response.json([]),
  ])('rejects malformed transcription JSON', async (response) => {
    const storage = memoryStorage()
    const fetcher = vi.fn()
      .mockResolvedValueOnce(
        Response.json({
          token: 'opaque-session-token',
          expiresAt: '2026-07-25T14:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(response)

    await expect(
      requestDemoTranscription(
        new Blob(['voice'], { type: 'audio/mp4' }),
        {
          fetcher,
          storage,
          location: locationFor(
            'https://fridge-elf-app.vercel.app',
          ),
          now: () => Date.UTC(2026, 6, 25, 12),
        },
      ),
    ).rejects.toMatchObject({
      code: 'RESPONSE_INVALID',
    })
  })

  it('works when AbortSignal.timeout is unavailable', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      AbortSignal,
      'timeout',
    )
    Object.defineProperty(AbortSignal, 'timeout', {
      configurable: true,
      value: undefined,
    })
    try {
      const storage = memoryStorage()
      const fetcher = vi.fn()
        .mockResolvedValueOnce(
          Response.json({
            token: 'opaque-session-token',
            expiresAt: '2026-07-25T14:00:00.000Z',
          }),
        )
        .mockResolvedValueOnce(
          Response.json({ text: '买两盒牛奶' }),
        )
      await requestDemoTranscription(
        new Blob(['voice'], { type: 'audio/webm' }),
        {
          fetcher,
          storage,
          location: locationFor(
            'https://fridge-elf-app.vercel.app',
          ),
          now: () => Date.UTC(2026, 6, 25, 12),
        },
      )
      expect(fetcher).toHaveBeenCalledTimes(2)
    } finally {
      if (descriptor) {
        Object.defineProperty(AbortSignal, 'timeout', descriptor)
      } else {
        Reflect.deleteProperty(AbortSignal, 'timeout')
      }
    }
  })

  it('preserves an allowlisted server code and response request ID', async () => {
    const storage = memoryStorage()
    const fetcher = vi.fn()
      .mockResolvedValueOnce(
        Response.json({
          token: 'opaque-session-token',
          expiresAt: '2026-07-25T14:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            error: {
              code: 'DEMO_RATE_LIMITED',
              message: '今天来访的人有点多',
            },
          },
          {
            status: 429,
            headers: { 'x-request-id': 'mobile-request-123' },
          },
        ),
      )

    await expect(
      requestDemoAgent(
        { mode: 'agent', message: '今晚吃什么？', snapshot },
        {
          fetcher,
          storage,
          location: locationFor(
            'https://fridge-elf-app.vercel.app',
          ),
          now: () => Date.UTC(2026, 6, 25, 12),
        },
      ),
    ).rejects.toMatchObject({
      name: 'DemoApiError',
      code: 'DEMO_RATE_LIMITED',
      status: 429,
      requestId: 'mobile-request-123',
    })
  })

  it('refreshes a rejected cached session once and retries Agent', async () => {
    const storage = memoryStorage()
    const fetcher = vi.fn()
      .mockResolvedValueOnce(
        Response.json({
          token: 'stale-session-token',
          expiresAt: '2026-07-25T14:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            error: {
              code: 'DEMO_SESSION_REQUIRED',
              message: '演示会话已失效',
            },
          },
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({
          token: 'fresh-session-token',
          expiresAt: '2026-07-25T14:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ answer: '新会话已恢复。' }),
      )

    await expect(
      requestDemoAgent(
        { mode: 'agent', message: '今晚吃什么？', snapshot },
        {
          fetcher,
          storage,
          location: locationFor(
            'https://fridge-elf-app.vercel.app',
          ),
          now: () => Date.UTC(2026, 6, 25, 12),
        },
      ),
    ).resolves.toMatchObject({ answer: '新会话已恢复。' })

    expect(fetcher).toHaveBeenCalledTimes(4)
    expect(fetcher.mock.calls[1]?.[1]?.headers.authorization).toBe(
      'Bearer stale-session-token',
    )
    expect(fetcher.mock.calls[3]?.[1]?.headers.authorization).toBe(
      'Bearer fresh-session-token',
    )
  })

  it('records redacted diagnostics without bearer tokens or request bodies', async () => {
    window.history.replaceState({}, '', '/demo?debug=network')
    const storage = memoryStorage()
    const fetcher = vi.fn()
      .mockResolvedValueOnce(
        Response.json({
          token: 'opaque-session-token',
          expiresAt: '2026-07-25T14:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ answer: '先吃番茄。' }),
      )

    await requestDemoAgent(
      { mode: 'agent', message: '今晚吃什么？', snapshot },
      {
        fetcher,
        storage,
        location: locationFor(
          'https://fridge-elf-app.vercel.app',
        ),
        now: () => Date.UTC(2026, 6, 25, 12),
      },
    )

    const report = networkDiagnostics.report()
    expect(report).toContain('"operation": "agent"')
    expect(report).toContain('"stage": "context"')
    expect(report).toContain('"serializedBytes": 238')
    expect(report).toContain('"truncated": false')
    expect(report).not.toContain('opaque-session-token')
    expect(report).not.toContain('今晚吃什么')
    expect(report).not.toContain('authorization')
  })

  it('surfaces a stable local error without leaking server payloads', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json(
        { error: { code: 'RAW_UPSTREAM', message: 'provider secret' } },
        { status: 502 },
      ),
    )

    await expect(
      getDemoSession({
        fetcher,
        storage: memoryStorage(),
        location: locationFor('https://fridge-elf-app.vercel.app'),
      }),
    ).rejects.toMatchObject({
      name: 'DemoApiError',
      code: 'DEMO_SESSION_UNAVAILABLE',
    })
  })
})
