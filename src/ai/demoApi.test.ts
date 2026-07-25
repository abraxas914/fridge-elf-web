import { describe, expect, it, vi } from 'vitest'
import {
  demoApiUrl,
  getDemoSession,
  requestDemoAgent,
  requestDemoIllustration,
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
        style: 'xiaohei',
        recipeText: '# 菜名\n食材：\n- 番茄\n步骤：\n1. 切块。',
        page: 1,
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
    expect(JSON.parse(init.body).style).toBe('xiaohei')
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
