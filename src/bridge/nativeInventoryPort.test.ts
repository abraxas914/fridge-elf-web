import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNativeInventoryPort } from './nativeInventoryPort'
import type { NativeEvent } from './types'

const item = {
  id: 'board-1',
  name: '鸡蛋',
  quantity: '1个',
  storage: '冷藏室',
  expiryDate: '2026-07-30',
  status: '新鲜',
}

const imageProviderMethods = {
  getImageProviderSummary: () =>
    JSON.stringify({
      status: 'not_configured',
      providerName: '',
      host: '',
      keyLast4: '',
      model: 'gpt-image-2',
    }),
  saveImageProviderConfig: () =>
    JSON.stringify({
      status: 'saved',
      providerName: 'Image2',
      host: 'image.example',
      keyLast4: '1234',
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
}

const recipeIllustrationMethods = {
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
      status: 'running',
      completedPages: 0,
      totalPages: 1,
      pages: [],
    }),
  removeRecipeIllustrationJob: () =>
    JSON.stringify({ removed: true }),
}

afterEach(() => {
  delete window.NativeBridge
  delete window.onNativeEvent
})

describe('createNativeInventoryPort', () => {
  it('returns null in a normal browser', () => {
    expect(createNativeInventoryPort()).toBeNull()
  })

  it('reads native state and forwards native events', async () => {
    const ready = vi.fn()
    window.NativeBridge = {
      getBridgeVersion: () => '1',
      getItems: () => JSON.stringify([item]),
      addItem: () => JSON.stringify(item),
      getMqttStatus: () =>
        JSON.stringify({ connected: true, detail: '开发板已同步' }),
      ...imageProviderMethods,
      ...recipeIllustrationMethods,
      ready,
    }

    const port = createNativeInventoryPort()
    const received: NativeEvent[] = []
    const unsubscribe = port?.subscribe((event) => received.push(event))

    expect(await port?.getItems()).toEqual([item])
    expect(await port?.getMqttStatus()).toEqual({
      connected: true,
      detail: '开发板已同步',
    })
    expect(ready).toHaveBeenCalledOnce()

    const event: NativeEvent = {
      type: 'inventory-updated',
      payload: { items: [item] },
    }
    window.onNativeEvent?.(event)
    expect(received).toEqual([event])

    unsubscribe?.()
    window.onNativeEvent?.(event)
    expect(received).toEqual([event])
  })

  it('surfaces native error envelopes', async () => {
    window.NativeBridge = {
      getBridgeVersion: () => '1',
      getItems: () =>
        JSON.stringify({
          error: { code: 'BROKEN', message: '库存读取失败' },
        }),
      addItem: () => JSON.stringify(item),
      getMqttStatus: () =>
        JSON.stringify({ connected: false, detail: '连接中' }),
      ...imageProviderMethods,
      ...recipeIllustrationMethods,
      ready: vi.fn(),
    }

    await expect(createNativeInventoryPort()?.getItems()).rejects.toThrow(
      '库存读取失败',
    )
  })
})
