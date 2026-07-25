import { describe, expect, it, vi } from 'vitest'
import { createBrowserMock, selectInventoryRuntime } from './browserMock'
import {
  createNativeBridge,
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
})
