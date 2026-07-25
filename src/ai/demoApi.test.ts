import { describe, expect, it, vi } from 'vitest'
import {
  demoApiUrl,
  getDemoSession,
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
  inventory: [],
  plannedMeals: [],
  missingItems: [],
  availableRecipes: [],
}

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('browser demo agent API', () => {
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
    'maps transcription HTTP %s without reading server details',
    async (status, code) => {
      const storage = memoryStorage()
      const json = vi.fn()
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
      expect(json).not.toHaveBeenCalled()
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
      code: 'TRANSCRIPTION_UNAVAILABLE',
    })
  })

  it('uses a dedicated 135 second transcription timeout', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
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

      expect(timeout).toHaveBeenNthCalledWith(1, 50_000)
      expect(timeout).toHaveBeenNthCalledWith(2, 135_000)
    } finally {
      timeout.mockRestore()
    }
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
