import { RECIPES } from '../fixtures/goldenFixture'
export {
  RECIPE_CATEGORIES,
  type RecipeCategory,
  type RecipeIngredient,
  type SavedRecipe,
} from './recipeTypes'
import type { SavedRecipe } from './recipeTypes'

function cloneRecipe(recipe: SavedRecipe): SavedRecipe {
  return {
    ...recipe,
    need: [...recipe.need],
    tags: [...recipe.tags],
    steps: recipe.steps ? [...recipe.steps] : undefined,
    ingredients: recipe.ingredients?.map((item) => ({ ...item })),
  }
}

export function mergeRecipeSeeds(
  stored: readonly SavedRecipe[],
  seeds: readonly SavedRecipe[] = RECIPES,
): SavedRecipe[] {
  const seedIds = new Set(seeds.map((recipe) => recipe.id))
  const customRecipes = stored.filter((recipe) => !seedIds.has(recipe.id))
  return [
    ...seeds.map(cloneRecipe),
    ...customRecipes.map(cloneRecipe),
  ]
}

export const defaultFavoriteRecipes = (): SavedRecipe[] =>
  RECIPES.map(cloneRecipe)

export function loadFavoriteRecipes(
  storage: Pick<Storage, 'getItem'> = localStorage,
): SavedRecipe[] {
  try {
    const value: unknown = JSON.parse(
      storage.getItem('fridge-favorite-recipes-v1') ?? 'null',
    )
    if (Array.isArray(value)) {
      return mergeRecipeSeeds(value as SavedRecipe[])
    }
  } catch {
    // Fall through to the starter recipes.
  }
  return defaultFavoriteRecipes()
}
