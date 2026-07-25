import type { FoodKey } from '../catalog/foodCatalog'
import { RECIPES } from '../fixtures/goldenFixture'

export interface SavedRecipe {
  id: string
  key: FoodKey | 'unknown'
  name: string
  cn: string
  kcal: number | null
  time: number
  tags: readonly string[]
  match: boolean
  need: readonly string[]
  desc: string
  steps?: readonly string[]
}

export const defaultFavoriteRecipes = (): SavedRecipe[] =>
  RECIPES.map((recipe) => ({
    ...recipe,
    need: [...recipe.need],
    tags: [...recipe.tags],
    steps: [],
  }))

export function loadFavoriteRecipes(
  storage: Pick<Storage, 'getItem'> = localStorage,
): SavedRecipe[] {
  try {
    const value: unknown = JSON.parse(
      storage.getItem('fridge-favorite-recipes-v1') ?? 'null',
    )
    if (Array.isArray(value)) return value as SavedRecipe[]
  } catch {
    // Fall through to the starter recipes.
  }
  return defaultFavoriteRecipes()
}
