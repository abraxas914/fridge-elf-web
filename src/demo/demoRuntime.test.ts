import { describe, expect, it, vi } from 'vitest'
import type { DemoAgentInput, DemoAgentResponse } from '../ai/types'
import { createDemoRuntime } from './demoRuntime'

const snapshot = {
  inventory: [],
  plannedMeals: [],
  missingItems: [],
  availableRecipes: [
    { id: 'recipe-tomato-egg-bowl', name: '番茄鸡蛋轻食碗' },
  ],
}

describe('managed Web Demo runtime', () => {
  it('creates an isolated in-memory product world for every visit', async () => {
    const first = createDemoRuntime()
    const second = createDemoRuntime()

    await first.inventory.addItem({
      name: '测试食材',
      quantity: '1份',
      storage: '冷藏室',
      expiryDate: '2026-08-01',
    })

    expect(
      (await first.inventory.getItems()).some(
        (item) => item.name === '测试食材',
      ),
    ).toBe(true)
    expect(
      (await second.inventory.getItems()).some(
        (item) => item.name === '测试食材',
      ),
    ).toBe(false)
  })

  it('reports managed capabilities without requiring visitor credentials', async () => {
    const summaries = await createDemoRuntime().credentials.getSummaries()

    expect(summaries.assistant).toMatchObject({
      status: 'verified',
      providerLabel: 'Fridge Elf Demo Gateway',
    })
    expect(summaries['recipe-illustration']).toMatchObject({
      status: 'verified',
      providerLabel: 'Fridge Elf Demo Gateway',
    })
  })

  it('maps Agent suggestions only to recipes already present in the demo', async () => {
    const requester = vi.fn(
      async (input: DemoAgentInput): Promise<DemoAgentResponse> => {
        expect(input).toEqual({
          mode: 'agent',
          message: '今晚吃什么？',
          snapshot,
        })
        return {
          answer: '优先消耗番茄和鸡蛋。',
          suggestions: [
            {
              title: '番茄鸡蛋轻食碗',
              reason: '库存齐全',
              recipeId: 'recipe-tomato-egg-bowl',
            },
            {
              title: '不存在的菜谱',
              reason: '不应注入状态',
              recipeId: 'recipe-unknown',
            },
          ],
        }
      },
    )
    const runtime = createDemoRuntime({ agentRequester: requester })

    await expect(
      runtime.assistant.ask({
        intent: 'agent',
        question: '今晚吃什么？',
        snapshot,
      }),
    ).resolves.toMatchObject({
      answer: '优先消耗番茄和鸡蛋。',
      recipes: [],
      shoppingItems: [],
      suggestShopping: false,
      existingRecipeIds: ['recipe-tomato-egg-bowl'],
    })
    expect(requester).toHaveBeenCalledOnce()
  })

  it('keeps voice parsing deterministic and offline', async () => {
    const requester = vi.fn()
    const runtime = createDemoRuntime({ agentRequester: requester })

    await expect(
      runtime.assistant.ask({
        intent: 'inventory-voice',
        question: '买两盒牛奶',
        snapshot,
      }),
    ).resolves.toMatchObject({
      shoppingItems: [
        {
          name: '牛奶',
          quantity: '2盒',
          reason: '语音添加',
        },
      ],
    })
    expect(requester).not.toHaveBeenCalled()
  })
})
