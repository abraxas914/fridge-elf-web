import { describe, expect, it, vi } from 'vitest'
import type { DemoAgentInput, DemoAgentResponse } from '../ai/types'
import { emptyPlanner } from '../app/state'
import { GOLDEN_PRESENTED_FOODS } from '../scenes/fridge/foodPresentation'
import { createDemoRuntime } from './demoRuntime'

const releasedContext = {
  question: '今晚吃什么？',
  inventory: GOLDEN_PRESENTED_FOODS.map((food) => ({
    name: food.name,
    quantity: food.quantity,
    storage: food.storage,
    addedDate: food.addedDate,
    expiryDate: food.expiryDate,
    status: food.status,
  })),
  profile: {},
  planner: emptyPlanner(),
  missingItems: [] as string[],
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

  it('reports every v1.0.1 AI capability as managed', () => {
    expect(createDemoRuntime().capabilities).toEqual({
      assistant: 'managed',
      recipeIllustration: 'managed',
      speechRecognition: 'managed',
    })
  })

  it('does not require visitor credentials for managed capabilities', async () => {
    const summaries = await createDemoRuntime().credentials.getSummaries()

    expect(summaries.assistant).toMatchObject({
      status: 'verified',
      providerLabel: 'Fridge Elf Demo Gateway',
    })
    expect(summaries['recipe-illustration']).toMatchObject({
      status: 'verified',
      providerLabel: 'Fridge Elf Demo Gateway',
    })
    expect(summaries['speech-recognition']).toMatchObject({
      status: 'verified',
      providerLabel: 'Fridge Elf Demo Gateway',
      modelId: 'managed-speech',
    })
  })

  it('uses an isolated managed transcription requester per runtime', async () => {
    const track = { stop: vi.fn() }
    const instances: Array<{
      stop(): void
      state: RecordingState
    }> = []
    class RuntimeMediaRecorder {
      static isTypeSupported(type: string) {
        return type === 'audio/webm;codecs=opus'
      }

      readonly mimeType = 'audio/webm;codecs=opus'
      state: RecordingState = 'inactive'
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onstop: (() => void) | null = null
      onerror: (() => void) | null = null

      constructor(
        _stream: MediaStream,
        _options?: MediaRecorderOptions,
      ) {
        instances.push(this)
      }

      start() {
        this.state = 'recording'
      }

      stop() {
        this.state = 'inactive'
        queueMicrotask(() => {
          this.ondataavailable?.({
            data: new Blob(['voice']),
          } as BlobEvent)
          this.onstop?.()
        })
      }
    }
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [track],
        }),
      },
    })
    vi.stubGlobal('MediaRecorder', RuntimeMediaRecorder)
    try {
      const firstRequester = vi.fn().mockResolvedValue('第一段录音')
      const secondRequester = vi.fn().mockResolvedValue('第二段录音')
      const first = createDemoRuntime({
        speechRequester: firstRequester,
      })
      const second = createDemoRuntime({
        speechRequester: secondRequester,
      })

      const firstSession = first.speech.start()
      const secondSession = second.speech.start()
      await vi.waitFor(() => expect(instances).toHaveLength(2))
      firstSession.stop()
      secondSession.stop()

      await expect(firstSession.result).resolves.toBe('第一段录音')
      await expect(secondSession.result).resolves.toBe('第二段录音')
      expect(firstRequester).toHaveBeenCalledOnce()
      expect(secondRequester).toHaveBeenCalledOnce()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('builds the managed Agent request from the released assistant context', async () => {
    const requester = vi.fn(
      async (input: DemoAgentInput): Promise<DemoAgentResponse> => {
        expect(input).toMatchObject({
          mode: 'agent',
          message: '今晚吃什么？',
          snapshot: {
            inventory: expect.arrayContaining([
              expect.objectContaining({
                name: '番茄',
                expiryLevel: 'urgent',
              }),
            ]),
            missingItems: [],
          },
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
      runtime.assistant.ask(releasedContext),
    ).resolves.toEqual({
      answer: '优先消耗番茄和鸡蛋。',
      recipes: [],
      shoppingItems: [],
      suggestShopping: false,
      existingRecipeIds: ['recipe-tomato-egg-bowl'],
      notices: [],
    })
    expect(requester).toHaveBeenCalledOnce()
  })

  it('uses the managed recommendation mode without a user message', async () => {
    const requester = vi.fn(
      async (_input: DemoAgentInput): Promise<DemoAgentResponse> => ({
      answer: '今天先做番茄鸡蛋轻食碗。',
      suggestions: [
        {
          title: '番茄鸡蛋轻食碗',
          reason: '番茄即将到期',
          recipeId: 'recipe-tomato-egg-bowl',
        },
      ],
      }),
    )
    const runtime = createDemoRuntime({ agentRequester: requester })
    const assistant = runtime.assistant as typeof runtime.assistant & {
      recommend(
        input: typeof releasedContext,
      ): ReturnType<typeof runtime.assistant.ask>
    }

    await expect(
      assistant.recommend(releasedContext),
    ).resolves.toMatchObject({
      answer: '今天先做番茄鸡蛋轻食碗。',
      existingRecipeIds: ['recipe-tomato-egg-bowl'],
    })
    expect(requester).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'recommend',
        snapshot: expect.any(Object),
      }),
    )
    expect(requester.mock.calls[0]?.[0]).not.toHaveProperty('message')
  })

  it('returns a deterministic read-only fixture when the gateway rejects', async () => {
    const runtime = createDemoRuntime({
      agentRequester: vi.fn().mockRejectedValue(new Error('offline')),
    })

    await expect(runtime.assistant.ask(releasedContext)).resolves.toEqual({
      answer:
        '网关暂时繁忙。演示建议：优先选择临期食材能覆盖的菜谱，并先安排到今天的餐次。',
      recipes: [],
      shoppingItems: [],
      suggestShopping: false,
      existingRecipeIds: [
        'recipe-tomato-egg-bowl',
        'recipe-veggie-noodle',
      ],
      notices: ['当前展示的是本地演示回退结果'],
    })
  })
})
