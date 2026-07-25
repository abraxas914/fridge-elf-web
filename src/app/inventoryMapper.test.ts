import { describe, expect, it } from 'vitest'
import type { InventoryItem } from '../bridge/types'
import { mapNativeInventoryItem } from './inventoryMapper'

const today = new Date('2026-07-24T12:00:00+08:00')

function nativeItem(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: 'native-1',
    name: '番茄',
    quantity: '2个',
    storage: 'fridge',
    expiryDate: '2026-07-26',
    status: 'synced',
    ...overrides,
  }
}

describe('native inventory presentation mapping', () => {
  it('uses known catalog art but retains authoritative native fields', () => {
    const mapped = mapNativeInventoryItem(nativeItem({}), today)

    expect(mapped).toMatchObject({
      id: 'native-1',
      key: 'tomato',
      name: '番茄',
      englishName: 'Tomato',
      quantity: '2个',
      storage: 'fridge',
      expiryDate: '2026-07-26',
      expiresInDays: 2,
      kcal: 18,
      addedDaysAgo: null,
      source: 'native',
    })
  })

  it('maps English catalog names without replacing native content', () => {
    const mapped = mapNativeInventoryItem(
      nativeItem({
        name: 'Milk',
        quantity: '750ml',
        expiryDate: '2026-07-25',
      }),
      today,
    )

    expect(mapped.key).toBe('milk')
    expect(mapped.name).toBe('Milk')
    expect(mapped.quantity).toBe('750ml')
    expect(mapped.expiryDate).toBe('2026-07-25')
  })

  it('renders honest neutral metadata for unknown native food', () => {
    const mapped = mapNativeInventoryItem(
      nativeItem({
        id: 'native-dragonfruit',
        name: '火龙果',
        quantity: '1个',
        expiryDate: 'not-a-date',
      }),
      today,
    )

    expect(mapped).toMatchObject({
      key: 'unknown',
      name: '火龙果',
      englishName: '--',
      quantity: '1个',
      expiryDate: 'not-a-date',
      expiresInDays: null,
      category: 'unknown',
      kcal: null,
      addedDaysAgo: null,
      source: 'native',
    })
  })
})
