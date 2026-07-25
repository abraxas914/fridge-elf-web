import type { PresentedFood } from '../../app/types'
import { GOLDEN_FOODS } from '../../fixtures/goldenFixture'

export const GOLDEN_PRESENTED_FOODS: readonly PresentedFood[] =
  GOLDEN_FOODS.map((food) => ({
    id: food.id,
    sourceIds: [food.id],
    batches: [
      {
        id: food.id,
        quantity: food.quantity,
        expiryDate: food.expiryDate,
      },
    ],
    key: food.key,
    name: food.name,
    englishName: food.englishName,
    quantity: food.quantity,
    storage: food.storage,
    expiryDate: food.expiryDate,
    addedDate: '待确认',
    expiresInDays: food.expiresInDays,
    category: food.category,
    kcal: food.kcal,
    addedDaysAgo: food.addedDaysAgo,
    batchCount: 1,
    status: 'fresh',
    source: 'fixture',
  }))
