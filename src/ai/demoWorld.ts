import type {
  PlannerMealKey,
  PlannerState,
  PresentedFood,
} from '../app/types'
import { RECIPES } from '../fixtures/goldenFixture'
import type {
  DemoPreferences,
  DemoWorldSnapshot,
} from './types'

export interface DemoWorldInput {
  inventory: readonly PresentedFood[]
  planner: PlannerState
  missingItems: readonly string[]
  profile?: unknown
}

const DEFAULT_PREFERENCES: DemoPreferences = {
  living: 'solo',
  taste: 'clean',
  fitness: 'balance',
  routine: 'normal',
  health: '',
}

function expiryLevel(
  expiresInDays: number | null,
): 'normal' | 'soon' | 'urgent' {
  if (expiresInDays !== null && expiresInDays <= 1) return 'urgent'
  if (expiresInDays !== null && expiresInDays <= 3) return 'soon'
  return 'normal'
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
) {
  return typeof value === 'string' && allowed.includes(value as T)
    ? value as T
    : fallback
}

function demoPreferences(value: unknown): DemoPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_PREFERENCES }
  }
  const profile = value as Record<string, unknown>
  return {
    living: enumValue(
      profile.living,
      ['solo', 'family', 'roomie'] as const,
      DEFAULT_PREFERENCES.living,
    ),
    taste: enumValue(
      profile.taste,
      ['spicy', 'hunan', 'clean', 'custom'] as const,
      DEFAULT_PREFERENCES.taste,
    ),
    fitness: enumValue(
      profile.fitness,
      ['gain', 'balance', 'light'] as const,
      DEFAULT_PREFERENCES.fitness,
    ),
    routine: enumValue(
      profile.routine,
      ['normal', 'quick', 'plan'] as const,
      DEFAULT_PREFERENCES.routine,
    ),
    health:
      typeof profile.health === 'string'
        ? profile.health.trim().slice(0, 120)
        : DEFAULT_PREFERENCES.health,
  }
}

function utf8Bytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}

export function buildDemoWorldSnapshot(
  input: DemoWorldInput,
): DemoWorldSnapshot {
  const context = {
    contextVersion: 2 as const,
    inventory: input.inventory.map((food) => ({
      id: food.id,
      name: food.name,
      englishName: food.englishName,
      quantity: food.quantity,
      category: food.category,
      kcal: food.kcal,
      storage: food.storage,
      expiryDate: food.expiryDate,
      expiresInDays: food.expiresInDays,
      addedDate: food.addedDate,
      addedDaysAgo: food.addedDaysAgo,
      batchCount: food.batchCount,
      status: food.status,
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
                recipeId: recipe.id,
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
      englishName: recipe.name,
      description: recipe.desc,
      kcal: recipe.kcal,
      timeMinutes: recipe.time,
      tags: [...recipe.tags],
      requiredIngredients: [...recipe.need],
      steps: [...recipe.steps],
      inventoryMatch: recipe.match,
    })),
    preferences: demoPreferences(input.profile),
  }
  return {
    ...context,
    contextMeta: {
      contextVersion: 2,
      serializedBytes: utf8Bytes(context),
      inventoryCount: context.inventory.length,
      plannedMealCount: context.plannedMeals.length,
      missingItemCount: context.missingItems.length,
      recipeCount: context.availableRecipes.length,
      truncated: false,
      omittedCount: 0,
    },
  }
}
