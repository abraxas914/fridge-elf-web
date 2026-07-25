import {
  foodCatalog,
  type FoodCatalogEntry,
  type FoodKey,
} from '../catalog/foodCatalog'
import type { InventoryItem } from '../bridge/types'
import type { PresentedFood } from './types'

const catalogByName = new Map<string, FoodCatalogEntry>(
  Object.values(foodCatalog).flatMap((entry) => [
    [entry.name.toLocaleLowerCase('zh-CN'), entry],
    [entry.englishName.toLocaleLowerCase('en-US'), entry],
  ]),
)

function catalogEntryFor(name: string) {
  return catalogByName.get(name.trim().toLocaleLowerCase('zh-CN'))
}

function daysUntil(expiryDate: string, today: Date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiryDate)
  if (!match) return null

  const expiryUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  )
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  return Math.ceil((expiryUtc - todayUtc) / 86_400_000)
}

export function mapNativeInventoryItem(
  item: InventoryItem,
  today: Date,
): PresentedFood {
  const catalog = catalogEntryFor(item.name)
  return {
    id: item.id,
    key: catalog?.key ?? 'unknown',
    name: item.name,
    englishName: catalog?.englishName ?? '--',
    quantity: item.quantity,
    storage: item.storage,
    expiryDate: item.expiryDate,
    expiresInDays: daysUntil(item.expiryDate, today),
    category: catalog?.category ?? 'unknown',
    kcal: catalog?.kcal ?? null,
    addedDaysAgo: null,
    status: item.status,
    source: 'native',
  }
}

export function mapNativeInventory(
  items: readonly InventoryItem[],
  today: Date,
) {
  return items.map((item) => mapNativeInventoryItem(item, today))
}

export function isKnownFoodKey(key: string): key is FoodKey {
  return key in foodCatalog
}
