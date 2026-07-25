import { describe, expect, it, vi } from 'vitest'
import { createBrowserMock, selectInventoryRuntime } from './browserMock'
import {
  createNativeBridge,
  createNativeRuntime,
  NativeBridgeError,
} from './nativeBridge'

function api(overrides: Partial<NativeBridgeApi> = {}): NativeBridgeApi {
  return {
    getBridgeVersion: () => '1',
    getItems: () =>
      JSON.stringify([
        {
          id: 'native-1',
          name: '番茄',
          quantity: '2个',
          storage: '冷藏室',
          expiryDate: '2026-07-27',
          status: '已同步',
        },
      ]),
    addItem: (name, quantity, storage, expiryDate) =>
      JSON.stringify({
        id: 'native-2',
        name,
        quantity,
        storage,
        expiryDate,
        status: '待同步',
      }),
    getMqttStatus: () =>
      JSON.stringify({ connected: true, detail: 'MQTT 已连接' }),
    getImageProviderSummary: () =>
      JSON.stringify({
        status: 'not_configured',
        providerName: '',
        host: '',
        keyLast4: '',
        model: 'gpt-image-2',
      }),
    saveImageProviderConfig: (providerName, endpoint, apiKey) =>
      JSON.stringify({
        status: 'saved',
        providerName,
        host: new URL(endpoint).host,
        keyLast4: apiKey.slice(-4),
        model: 'gpt-image-2',
      }),
    removeImageProviderConfig: () =>
      JSON.stringify({
        status: 'not_configured',
        providerName: '',
        host: '',
        keyLast4: '',
        model: 'gpt-image-2',
      }),
    getCredentialSummaries: () =>
      JSON.stringify({
        assistant: {
          capability: 'assistant',
          status: 'not_configured',
          providerId: '',
          providerLabel: '',
          modelId: '',
        },
        'recipe-illustration': {
          capability: 'recipe-illustration',
          status: 'not_configured',
          providerId: '',
          providerLabel: '',
          modelId: '',
        },
      }),
    saveCredentialConfig: (
      capability,
      providerId,
      providerLabel,
      modelId,
    ) =>
      JSON.stringify({
        capability,
        status: 'saved',
        providerId,
        providerLabel,
        modelId,
      }),
    removeCredentialConfig: (capability) =>
      JSON.stringify({
        capability,
        status: 'not_configured',
        providerId: '',
        providerLabel: '',
        modelId: '',
      }),
    startRecipeIllustration: () =>
      JSON.stringify({
        id: 'job-1',
        status: 'queued',
        completedPages: 0,
        totalPages: 1,
        pages: [],
      }),
    getRecipeIllustrationJob: () =>
      JSON.stringify({
        id: 'job-1',
        status: 'succeeded',
        completedPages: 1,
        totalPages: 1,
        pages: [
          {
            index: 1,
            imageUrl:
              'https://appassets.androidplatform.net/generated/job-1/1.png',
          },
        ],
      }),
    removeRecipeIllustrationJob: () => JSON.stringify({ removed: true }),
    ready: vi.fn(),
    ...overrides,
  }
}

describe('typed NativeBridge boundary', () => {
  it('selects deterministic browser mock mode when NativeBridge is absent', async () => {
    const hostWindow = {} as Window
    const runtime = selectInventoryRuntime(hostWindow)
    expect(runtime.mode).toBe('browser-mock')
    expect(await runtime.inventory.getItems()).toHaveLength(18)
    expect(await runtime.inventory.getMqttStatus()).toEqual({
      connected: true,
      detail: 'BROWSER MOCK',
    })
  })

  it('requires bridge version 1 and parses all three JSON calls', async () => {
    const bridgeApi = api()
    const bridge = createNativeBridge(bridgeApi, {} as Window)
    expect(await bridge.getItems()).toHaveLength(1)
    expect(await bridge.getMqttStatus()).toEqual({
      connected: true,
      detail: 'MQTT 已连接',
    })
    expect(
      await bridge.addItem({
        name: '牛奶',
        quantity: '1盒',
        storage: '冷藏室',
        expiryDate: '2026-07-30',
      }),
    ).toMatchObject({ name: '牛奶', status: '待同步' })

    expect(() =>
      createNativeBridge(api({ getBridgeVersion: () => '2' }), {} as Window),
    ).toThrow(/版本不兼容/)
  })

  it('exposes safe summaries for both AI capabilities', async () => {
    const bridge = createNativeBridge(api(), {} as Window)
    await expect(bridge.getSummaries()).resolves.toEqual({
      assistant: expect.objectContaining({ capability: 'assistant' }),
      'recipe-illustration': expect.objectContaining({
        capability: 'recipe-illustration',
      }),
    })
  })

  it('turns structured failures and malformed JSON into typed errors', async () => {
    const structured = createNativeBridge(
      api({
        getItems: () =>
          JSON.stringify({
            error: { code: 'OUTBOX_FULL', message: '同步队列已满' },
          }),
      }),
      {} as Window,
    )
    await expect(structured.getItems()).rejects.toMatchObject({
      code: 'OUTBOX_FULL',
      message: '同步队列已满',
    })

    const malformed = createNativeBridge(
      api({ getMqttStatus: () => '{bad json' }),
      {} as Window,
    )
    await expect(malformed.getMqttStatus()).rejects.toBeInstanceOf(
      NativeBridgeError,
    )
  })

  it('starts and reads recipe illustration jobs without exposing BYOK data', async () => {
    const startRecipeIllustration = vi.fn(api().startRecipeIllustration)
    const bridge = createNativeBridge(
      api({ startRecipeIllustration }),
      {} as Window,
    )

    const started = await bridge.start({
      contractVersion: 1,
      recipe: {
        id: 'recipe-test',
        title: '番茄炒蛋',
        ingredients: [{ name: '番茄', amount: '2个' }],
        steps: [{ order: 1, action: '番茄切块' }],
      },
      styleId: 'pixel-person',
    })

    expect(started).toMatchObject({
      id: 'job-1',
      status: 'queued',
      totalPages: 1,
    })
    const nativeRequest = String(startRecipeIllustration.mock.calls[0][0])
    expect(JSON.parse(nativeRequest)).toMatchObject({
      contractVersion: 1,
      styleId: 'pixel-person',
    })
    expect(nativeRequest).toContain('recipe-pixel-doodle-illustrations')
    expect(nativeRequest).not.toContain('apiKey')
    expect(nativeRequest).not.toContain('/images/generations')
    expect(await bridge.getJob('job-1')).toMatchObject({
      status: 'succeeded',
      pages: [{ index: 1 }],
    })
    await expect(bridge.remove('job-1')).resolves.toBeUndefined()
  })

  it('rejects malformed recipe illustration job JSON', async () => {
    const bridge = createNativeBridge(
      api({
        getRecipeIllustrationJob: () =>
          JSON.stringify({
            id: 'job-1',
            status: 'succeeded',
            completedPages: 1,
            totalPages: 1,
            pages: [{ index: 1, imageUrl: 'javascript:alert(1)' }],
          }),
      }),
      {} as Window,
    )

    await expect(bridge.getJob('job-1')).rejects.toMatchObject({
      code: 'INVALID_RECIPE_ILLUSTRATION_JOB',
    })
  })

  it('parses the shared recipe illustration error envelope', async () => {
    const bridge = createNativeBridge(
      api({
        getRecipeIllustrationJob: () =>
          JSON.stringify({
            id: 'job-1',
            status: 'failed',
            completedPages: 0,
            totalPages: 1,
            pages: [],
            error: {
              code: 'IMAGE_GENERATION_FAILED',
              message: '服务暂时不可用',
            },
          }),
      }),
      {} as Window,
    )

    await expect(bridge.getJob('job-1')).resolves.toMatchObject({
      error: {
        code: 'IMAGE_GENERATION_FAILED',
        message: '服务暂时不可用',
      },
    })
  })

  it('installs the event handler before ready and validates queued events', () => {
    const bridgeApi = api()
    const hostWindow = {} as Window
    const bridge = createNativeBridge(bridgeApi, hostWindow)
    expect(hostWindow.onNativeEvent).toBeTypeOf('function')
    expect(bridgeApi.ready).not.toHaveBeenCalled()

    const listener = vi.fn()
    const unsubscribe = bridge.subscribe(listener)
    bridge.subscribe(listener)
    expect(bridgeApi.ready).toHaveBeenCalledOnce()
    hostWindow.onNativeEvent?.({
      type: 'mqtt-status',
      payload: { connected: false, detail: '离线' },
    })
    expect(listener).toHaveBeenCalledOnce()

    hostWindow.onNativeEvent?.({
      type: 'inventory-updated',
      payload: { items: [{ id: 1 }] },
    })
    expect(listener).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it('persists only browser inventory and publishes one replacement event', async () => {
    const memory = new Map<string, string>()
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
    }
    const mock = createBrowserMock(storage)
    const listener = vi.fn()
    mock.subscribe(listener)
    await mock.addItem({
      name: '酸奶',
      quantity: '2杯',
      storage: '冷藏室',
      expiryDate: '2026-07-31',
    })

    expect([...memory.keys()]).toEqual([
      'life-helper-v2-browser-inventory',
    ])
    expect(listener).toHaveBeenCalledOnce()
    expect((await createBrowserMock(storage).getItems()).at(-1)).toMatchObject({
      name: '酸奶',
      status: '本地预览',
    })
  })

  it('routes assistant, speech, display, remove, and quantity through one typed runtime', async () => {
    const askAssistant = vi.fn<
      (requestId: string, requestJson: string) => string
    >(() => '{"accepted":true}')
    const startSpeechRecognition = vi.fn<(requestId: string) => string>(
      () => '{"accepted":true}',
    )
    const stopSpeechRecognition = vi.fn<(requestId: string) => string>(
      () => '{"accepted":true}',
    )
    const setDisplayState = vi.fn<(stateJson: string) => string>(
      () => '{"accepted":true}',
    )
    const removeItem = vi.fn<(itemId: string) => string>(
      () => '{"accepted":true}',
    )
    const updateItemQuantity = vi.fn<
      (itemId: string, quantity: string) => string
    >(() => '{"accepted":true}')
    const hostWindow = {} as Window
    const runtime = createNativeRuntime(
      api({
        askAssistant,
        startSpeechRecognition,
        stopSpeechRecognition,
        setDisplayState,
        removeItem,
        updateItemQuantity,
      }),
      hostWindow,
    )

    const assistant = runtime.assistant.ask({ question: '晚饭吃什么？' })
    const assistantId = askAssistant.mock.calls[0]?.[0]
    expect(JSON.parse(askAssistant.mock.calls[0]?.[1] ?? '{}')).toEqual({
      question: '晚饭吃什么？',
    })
    hostWindow.onNativeEvent?.({
      type: 'assistant-result',
      payload: {
        requestId: assistantId,
        result: {
          answer: '做番茄鸡蛋。',
          recipes: [],
          shoppingItems: [],
          suggestShopping: false,
        },
      },
    })
    await expect(assistant).resolves.toMatchObject({
      answer: '做番茄鸡蛋。',
    })

    const speech = runtime.speech.start()
    const speechId = startSpeechRecognition.mock.calls[0]?.[0]
    speech.stop()
    expect(stopSpeechRecognition).toHaveBeenCalledWith(speechId)
    hostWindow.onNativeEvent?.({
      type: 'speech-result',
      payload: { requestId: speechId, text: '买两盒牛奶' },
    })
    await expect(speech.result).resolves.toBe('买两盒牛奶')

    await runtime.display.setState({
      mode: 'meals',
      note: '',
      meals: ['粥', '面', '饭'],
      date: '2026-07-25',
      calendarText: '',
    })
    expect(JSON.parse(setDisplayState.mock.calls[0]?.[0] ?? '{}')).toMatchObject({
      mode: 'meals',
      meals: ['粥', '面', '饭'],
    })

    await runtime.inventory.removeItem('native-1')
    await runtime.inventory.updateItemQuantity('native-1', '1个')
    expect(removeItem).toHaveBeenCalledWith('native-1')
    expect(updateItemQuantity).toHaveBeenCalledWith('native-1', '1个')
  })

  it('provides deterministic browser implementations for every capability', async () => {
    const runtime = selectInventoryRuntime({} as Window)
    await expect(
      runtime.assistant.ask({ question: '推荐一道菜' }),
    ).resolves.toMatchObject({
      answer: expect.stringContaining('BROWSER MOCK'),
    })
    const speech = runtime.speech.start()
    await expect(speech.result).resolves.toBe('买两盒牛奶')
    await expect(
      runtime.display.setState({
        mode: 'note',
        note: '早点回家',
        meals: ['', '', ''],
        date: '2026-07-25',
        calendarText: '',
      }),
    ).resolves.toBeUndefined()

    const first = (await runtime.inventory.getItems())[0]
    await runtime.inventory.updateItemQuantity(first.id, '只剩1份')
    expect((await runtime.inventory.getItems())[0].quantity).toBe('只剩1份')
    await runtime.inventory.removeItem(first.id)
    expect(await runtime.inventory.getItems()).not.toContainEqual(
      expect.objectContaining({ id: first.id }),
    )
  })
})
