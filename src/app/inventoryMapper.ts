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

function normalizedAddedDate(value: string, today: Date) {
  if (value === '今天') {
    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')
  }
  if (value === '') return '待确认'
  return /^(\d{4})-(\d{2})-(\d{2})$/.test(value) ? value : '待确认'
}

function daysSince(value: string, today: Date) {
  const days = daysUntil(value, today)
  return days === null ? null : Math.max(0, -days)
}

function combineQuantity(values: readonly string[]) {
  const parsed = values.map((value) =>
    /^(\d+(?:\.\d+)?)\s*(.*)$/.exec(value.trim()),
  )
  const unit = parsed[0]?.[2]
  if (
    unit !== undefined &&
    parsed.every((match) => match?.[2] === unit)
  ) {
    const total = parsed.reduce(
      (sum, match) => sum + Number(match?.[1]),
      0,
    )
    return `${Number(total.toFixed(2))}${unit}`
  }
  return values.join(' + ')
}

export function mapNativeInventoryItem(
  item: InventoryItem,
  today: Date,
): PresentedFood {
  const catalog = catalogEntryFor(item.name)
  const addedDate = normalizedAddedDate(item.addedDate ?? '', today)
  return {
    id: item.id,
    sourceIds: [item.id],
    batches: [
      {
        id: item.id,
        quantity: item.quantity,
        expiryDate: item.expiryDate,
      },
    ],
    key: catalog?.key ?? 'unknown',
    name: item.name,
    englishName: catalog?.englishName ?? '--',
    quantity: item.quantity,
    storage: item.storage,
    expiryDate: item.expiryDate,
    addedDate,
    expiresInDays: daysUntil(item.expiryDate, today),
    category: catalog?.category ?? 'unknown',
    kcal: catalog?.kcal ?? null,
    addedDaysAgo: daysSince(addedDate, today),
    batchCount: 1,
    status: item.status,
    source: 'native',
  }
}

export function mapNativeInventory(
  items: readonly InventoryItem[],
  today: Date,
) {
  const mapped = items.map((item) => mapNativeInventoryItem(item, today))
  const groups = new Map<string, PresentedFood[]>()

  for (const food of mapped) {
    const groupKey = [
      food.name.trim().toLocaleLowerCase('zh-CN'),
      food.storage,
      food.addedDate,
    ].join('|')
    const group = groups.get(groupKey) ?? []
    group.push(food)
    groups.set(groupKey, group)
  }

  return [...groups.values()].map((group) => {
    const [first] = group
    if (group.length === 1) return first
    const expiryValues = group
      .map((food) => food.expiresInDays)
      .filter((value): value is number => value !== null)
    const earliest = group.reduce((current, food) =>
      food.expiryDate < current.expiryDate ? food : current,
    )
    return {
      ...first,
      id: group.map((food) => food.id).join('+'),
      sourceIds: group.flatMap((food) => food.sourceIds),
      batches: group.flatMap((food) => food.batches),
      quantity: combineQuantity(group.map((food) => food.quantity)),
      expiryDate: earliest.expiryDate,
      expiresInDays: expiryValues.length
        ? Math.min(...expiryValues)
        : null,
      batchCount: group.length,
      status: group.some((food) => food.status === '待同步')
        ? '待同步'
        : first.status,
    }
  })
}

export function isKnownFoodKey(key: string): key is FoodKey {
  return key in foodCatalog
}
