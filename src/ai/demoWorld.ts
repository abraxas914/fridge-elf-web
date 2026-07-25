import type {
  PlannerMealKey,
  PlannerState,
  PresentedFood,
} from '../app/types'
import { RECIPES } from '../fixtures/goldenFixture'
import type { DemoWorldSnapshot } from './types'

export interface DemoWorldInput {
  inventory: readonly PresentedFood[]
  planner: PlannerState
  missingItems: readonly string[]
}

function expiryLevel(
  expiresInDays: number | null,
): 'normal' | 'soon' | 'urgent' {
  if (expiresInDays !== null && expiresInDays <= 1) return 'urgent'
  if (expiresInDays !== null && expiresInDays <= 3) return 'soon'
  return 'normal'
}

export function buildDemoWorldSnapshot(
  input: DemoWorldInput,
): DemoWorldSnapshot {
  return {
    inventory: input.inventory.map((food) => ({
      name: food.name,
      quantity: food.quantity,
      category: food.category,
      expiryLevel: expiryLevel(food.expiresInDays),
    })),
    plannedMeals: Object.entries(input.planner).flatMap(([day, meals]) =>
      Object.entries(meals).flatMap(([meal, recipeId]) => {
        if (!recipeId) return []
        const recipe = RECIPES.find((candidate) => candidate.id === recipeId)
        return recipe
          ? [
              {
                day,
                meal: meal as PlannerMealKey,
                recipeName: recipe.cn,
              },
            ]
          : []
      }),
    ),
    missingItems: [...input.missingItems],
    availableRecipes: RECIPES.map((recipe) => ({
      id: recipe.id,
      name: recipe.cn,
    })),
  }
}
