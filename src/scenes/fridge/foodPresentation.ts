import type { PresentedFood } from '../../app/types'
import { GOLDEN_FOODS } from '../../fixtures/goldenFixture'

export const GOLDEN_PRESENTED_FOODS: readonly PresentedFood[] =
  GOLDEN_FOODS.map((food) => ({
    id: food.id,
    key: food.key,
    name: food.name,
    englishName: food.englishName,
    quantity: food.quantity,
    storage: food.storage,
    expiryDate: food.expiryDate,
    expiresInDays: food.expiresInDays,
    category: food.category,
    kcal: food.kcal,
    addedDaysAgo: food.addedDaysAgo,
    status: 'fresh',
    source: 'fixture',
  }))
