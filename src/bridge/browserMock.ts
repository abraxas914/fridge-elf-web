import type { InventoryPort } from '../app/ports'
import { GOLDEN_FOODS } from '../fixtures/goldenFixture'
import { createNativeBridge } from './nativeBridge'
import type {
  AddInventoryItem,
  InventoryItem,
  NativeEvent,
} from './types'

function fixtureItems(): InventoryItem[] {
  return GOLDEN_FOODS.map((food) => ({
    id: food.id,
    name: food.name,
    quantity: food.quantity,
    storage: '冷藏室',
    expiryDate: food.expiryDate,
    status: '新鲜',
  }))
}

export function createBrowserMock(): InventoryPort {
  let items = fixtureItems()
  const listeners = new Set<(event: NativeEvent) => void>()

  const publishInventory = () => {
    const event: NativeEvent = {
      type: 'inventory-updated',
      payload: { items: items.map((item) => ({ ...item })) },
    }
    for (const listener of listeners) listener(event)
  }

  return {
    async getItems() {
      return items.map((item) => ({ ...item }))
    },
    async addItem(input: AddInventoryItem) {
      const item: InventoryItem = {
        id: `mock-${items.length + 1}`,
        ...input,
        status: '本地预览',
      }
      items = [...items, item]
      publishInventory()
      return { ...item }
    },
    async getMqttStatus() {
      return { connected: true, detail: 'BROWSER MOCK' }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export type RuntimeMode = 'native' | 'browser-mock'

export function selectInventoryRuntime(
  hostWindow: Window = window,
): { inventory: InventoryPort; mode: RuntimeMode } {
  if (hostWindow.NativeBridge) {
    try {
      return {
        inventory: createNativeBridge(hostWindow.NativeBridge, hostWindow),
        mode: 'native',
      }
    } catch {
      return { inventory: createBrowserMock(), mode: 'browser-mock' }
    }
  }
  return { inventory: createBrowserMock(), mode: 'browser-mock' }
}
