import { describe, expect, it, vi } from 'vitest'
import { handleDemoAgentRequest } from './_lib/demoAgent'
import { issueDemoSession } from './_lib/demoSession'

const environment = {
  DEMO_SESSION_SECRET: 'demo-session-secret-for-tests',
  HEADLESS_GATEWAY_BASE_URL: 'http://gateway.internal:3001',
  HEADLESS_GATEWAY_API_KEY: 'server-only-test-key',
  HEADLESS_GATEWAY_DEFAULT_MODEL: 'gpt-5.4',
}

const snapshot = {
  contextVersion: 2,
  inventory: [
    {
      id: 'food-tomato',
      name: '番茄',
      englishName: 'Tomato',
      quantity: '4个',
      category: 'ingredient',
      kcal: 18,
      storage: 'fridge',
      expiryDate: '2026-07-25',
      expiresInDays: 1,
      addedDate: '2026-07-23',
      addedDaysAgo: 2,
      batchCount: 1,
      status: 'fresh',
      expiryLevel: 'urgent',
    },
    {
      id: 'food-egg',
      name: '鸡蛋',
      englishName: 'Egg',
      quantity: '10个',
      category: 'other',
      kcal: 155,
      storage: 'fridge',
      expiryDate: '2026-08-13',
      expiresInDays: 20,
      addedDate: '2026-07-22',
      addedDaysAgo: 3,
      batchCount: 1,
      status: 'fresh',
      expiryLevel: 'normal',
    },
  ],
  plannedMeals: [
    {
      day: 'tue',
      meal: 'breakfast',
      recipeId: 'recipe-tomato-egg-bowl',
      recipeName: '番茄鸡蛋轻食碗',
    },
  ],
  missingItems: ['燕麦'],
  availableRecipes: [
    {
      id: 'recipe-tomato-egg-bowl',
      name: '番茄鸡蛋轻食碗',
      englishName: 'TOMATO EGG BOWL',
      description: '优先消耗临期番茄的快手菜。',
      kcal: 320,
      timeMinutes: 15,
      tags: ['轻食', '高蛋白'],
      requiredIngredients: ['tomato', 'egg'],
      steps: ['番茄切块，鸡蛋打散。', '先炒鸡蛋，再与番茄翻炒。'],
      inventoryMatch: true,
    },
  ],
  preferences: {
    living: 'family',
    taste: 'clean',
    fitness: 'balance',
    routine: 'quick',
    health: '乳糖不耐',
  },
  contextMeta: {
    contextVersion: 2,
    serializedBytes: 1_842,
    inventoryCount: 2,
    plannedMealCount: 1,
    missingItemCount: 1,
    recipeCount: 1,
    truncated: false,
    omittedCount: 0,
  },
}

function authorizedRequest(
  body: unknown,
  options: { method?: string; origin?: string } = {},
) {
  const token = issueDemoSession(
    environment.DEMO_SESSION_SECRET,
    Date.now(),
  ).token
  return new Request(
    'https://fridge-elf-app.vercel.app/api/demo/agent',
    {
      method: options.method ?? 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        origin: options.origin ?? 'https://fridge-elf-app.vercel.app',
        'x-request-id': 'mobile-agent-123',
      },
      body:
        (options.method ?? 'POST') === 'POST'
          ? JSON.stringify(body)
          : undefined,
    },
  )
}

function gatewayResponse(content: string) {
  return Response.json({
    choices: [{ message: { content } }],
  })
}

describe('stateless demo agent BFF', () => {
  it('rejects requests without a signed anonymous session', async () => {
    const request = new Request(
      'https://fridge-elf-app.vercel.app/api/demo/agent',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://fridge-elf-app.vercel.app',
        },
        body: JSON.stringify({ message: '今晚吃什么？', snapshot }),
      },
    )

    const response = await handleDemoAgentRequest(
      request,
      environment,
      'agent',
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { code: 'DEMO_SESSION_REQUIRED', message: '演示会话已失效，请刷新后重试' },
    })
  })

  it('accepts detailed questions up to 4,000 characters and rejects larger ones', async () => {
    const acceptedFetcher = vi.fn().mockResolvedValue(
      gatewayResponse(JSON.stringify({ answer: '已收到详细问题。' })),
    )
    const accepted = await handleDemoAgentRequest(
      authorizedRequest({ message: '问'.repeat(4_000), snapshot }),
      environment,
      'agent',
      acceptedFetcher,
    )
    const fetcher = vi.fn()
    const oversized = await handleDemoAgentRequest(
      authorizedRequest({ message: '问'.repeat(4_001), snapshot }),
      environment,
      'agent',
      fetcher,
    )
    const malformed = await handleDemoAgentRequest(
      authorizedRequest({
        message: '今晚吃什么？',
        snapshot: { ...snapshot, inventory: '番茄' },
      }),
      environment,
      'agent',
      fetcher,
    )

    expect(accepted.status).toBe(200)
    expect(acceptedFetcher).toHaveBeenCalledOnce()
    expect(oversized.status).toBe(400)
    expect(malformed.status).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('returns an explicit error when Context V2 exceeds 128 KiB', async () => {
    const fetcher = vi.fn()
    const response = await handleDemoAgentRequest(
      authorizedRequest({
        message: '今晚吃什么？',
        snapshot,
        padding: '文'.repeat(50_000),
      }),
      environment,
      'agent',
      fetcher,
    )

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      error: {
        code: 'CONTEXT_TOO_LARGE',
        message: '模拟世界数据超过 128KB，请缩小后重试',
      },
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('forwards a fixed-model agent request and allowlists the JSON response', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      gatewayResponse(
        [
          '```json',
          JSON.stringify({
            answer: '先用今天临期的番茄配鸡蛋。',
            suggestions: [
              {
                title: '番茄鸡蛋轻食碗',
                reason: '两样食材都在冰箱里',
                recipeId: 'recipe-tomato-egg-bowl',
                tool: 'delete_inventory',
              },
            ],
            notices: ['番茄今天临期'],
            action: { type: 'remove', id: 'food-tomato' },
          }),
          '```',
        ].join('\n'),
      ),
    )

    const response = await handleDemoAgentRequest(
      authorizedRequest({ message: '今晚吃什么？', snapshot }),
      environment,
      'agent',
      fetcher,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toBe(
      'mobile-agent-123',
    )
    expect(await response.json()).toEqual({
      answer: '先用今天临期的番茄配鸡蛋。',
      suggestions: [
        {
          title: '番茄鸡蛋轻食碗',
          reason: '两样食材都在冰箱里',
          recipeId: 'recipe-tomato-egg-bowl',
        },
      ],
      notices: ['番茄今天临期'],
    })
    expect(fetcher).toHaveBeenCalledOnce()
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe('http://gateway.internal:3001/v1/chat/completions')
    expect(init.headers.authorization).toBe(
      'Bearer server-only-test-key',
    )
    const upstreamBody = JSON.parse(init.body)
    expect(upstreamBody.model).toBe('gpt-5.4')
    expect(upstreamBody.stream).toBe(false)
    expect(upstreamBody.messages[0].content).toContain('只读')
    expect(upstreamBody.messages[1].content).toContain('番茄')
    expect(upstreamBody.messages[1].content).toContain('乳糖不耐')
    expect(upstreamBody.messages[1].content).toContain('番茄切块')
    expect(upstreamBody.messages[1].content).toContain('"meal":"breakfast"')
    expect(upstreamBody.messages[1].content).toContain('"truncated":false')
  })

  it('keeps up to five detailed suggestions and notices', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      gatewayResponse(
        JSON.stringify({
          answer: '详'.repeat(2_000),
          suggestions: Array.from({ length: 6 }, (_, index) => ({
            title: `建议 ${index + 1}`,
            reason: `结合临期、口味和计划说明 ${index + 1}`.repeat(8),
            recipeId: 'recipe-tomato-egg-bowl',
          })),
          notices: Array.from(
            { length: 6 },
            (_, index) => `提醒 ${index + 1}`,
          ),
        }),
      ),
    )

    const response = await handleDemoAgentRequest(
      authorizedRequest({ message: '详细规划一下', snapshot }),
      environment,
      'agent',
      fetcher,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.answer.length).toBeGreaterThan(1_200)
    expect(payload.suggestions).toHaveLength(5)
    expect(payload.notices).toHaveLength(5)
  })

  it('drops recipe IDs not present in the submitted world snapshot', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      gatewayResponse(
        JSON.stringify({
          answer: '可以先做一道快手菜。',
          suggestions: [
            {
              title: '不存在的菜谱',
              reason: '测试',
              recipeId: 'recipe-not-in-demo',
            },
          ],
        }),
      ),
    )

    const response = await handleDemoAgentRequest(
      authorizedRequest({ message: '推荐一道菜', snapshot }),
      environment,
      'agent',
      fetcher,
    )

    expect(await response.json()).toEqual({
      answer: '可以先做一道快手菜。',
      suggestions: [{ title: '不存在的菜谱', reason: '测试' }],
    })
  })

  it('uses a separate fixed recommendation instruction', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      gatewayResponse(JSON.stringify({ answer: '优先吃番茄。' })),
    )

    const response = await handleDemoAgentRequest(
      authorizedRequest({ snapshot }),
      environment,
      'recommend',
      fetcher,
    )

    expect(response.status).toBe(200)
    const upstreamBody = JSON.parse(fetcher.mock.calls[0][1].body)
    expect(upstreamBody.messages[0].content).toContain('今日推荐')
    expect(upstreamBody.messages[1].content).not.toContain('"message"')
  })

  it('cleans upstream throttling and malformed responses', async () => {
    const throttled = await handleDemoAgentRequest(
      authorizedRequest({ message: '今晚吃什么？', snapshot }),
      environment,
      'agent',
      vi.fn().mockResolvedValue(
        Response.json(
          { secret: 'raw provider response' },
          { status: 429, headers: { 'retry-after': '42' } },
        ),
      ),
    )
    const malformed = await handleDemoAgentRequest(
      authorizedRequest({ message: '今晚吃什么？', snapshot }),
      environment,
      'agent',
      vi.fn().mockResolvedValue(gatewayResponse('not json')),
    )

    expect(throttled.status).toBe(429)
    expect(throttled.headers.get('retry-after')).toBe('42')
    expect(JSON.stringify(await throttled.json())).not.toContain('provider')
    expect(malformed.status).toBe(502)
    expect(await malformed.json()).toEqual({
      error: { code: 'AGENT_UNAVAILABLE', message: '在线建议暂时走神了' },
    })
  })
})
