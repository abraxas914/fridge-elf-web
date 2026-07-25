import { RECIPES } from '../fixtures/goldenFixture'
export {
  RECIPE_CATEGORIES,
  type RecipeCategory,
  type RecipeIngredient,
  type SavedRecipe,
} from './recipeTypes'
import type { SavedRecipe } from './recipeTypes'

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
