import type {
  RecipeIllustrationIngredient,
  RecipeIllustrationPagePlan,
  RecipeIllustrationPlan,
  RecipeIllustrationRecipe,
} from './types'

const MAX_STEPS_PER_PAGE = 6
const MAX_DISPLAY_INGREDIENTS = 8

function compactIngredients(
  ingredients: RecipeIllustrationIngredient[],
): RecipeIllustrationIngredient[] {
  if (ingredients.length <= MAX_DISPLAY_INGREDIENTS) {
    return ingredients.map((ingredient) => ({ ...ingredient }))
  }
  const visible = ingredients.slice(0, MAX_DISPLAY_INGREDIENTS - 1)
  const remainder = ingredients.slice(MAX_DISPLAY_INGREDIENTS - 1)
  return [
    ...visible.map((ingredient) => ({ ...ingredient })),
    {
      name: `其他食材（${remainder
        .map((ingredient) =>
          ingredient.amount
            ? `${ingredient.name} ${ingredient.amount}`
            : ingredient.name,
        )
        .join('、')}）`,
    },
  ]
}

function copyRecipe(
  recipe: RecipeIllustrationRecipe,
): RecipeIllustrationRecipe {
  return {
    id: recipe.id,
    title: [...recipe.title.trim()].slice(0, 12).join(''),
    ...(recipe.servings?.trim()
      ? { servings: recipe.servings.trim() }
      : {}),
    ingredients: recipe.ingredients.map((ingredient) => ({
      name: ingredient.name,
      ...(ingredient.amount ? { amount: ingredient.amount } : {}),
    })),
    steps: recipe.steps.map((step) => ({
      order: step.order,
      action: step.action,
      ...(step.target ? { target: step.target } : {}),
      ...(step.time ? { time: step.time } : {}),
      ...(step.heat ? { heat: step.heat } : {}),
      ...(step.doneness ? { doneness: step.doneness } : {}),
    })),
  }
}

export function buildRecipeIllustrationPlan(
  sourceRecipe: RecipeIllustrationRecipe,
): RecipeIllustrationPlan {
  const recipe = copyRecipe(sourceRecipe)
  const pageCount = Math.max(
    1,
    Math.ceil(recipe.steps.length / MAX_STEPS_PER_PAGE),
  )
  const pages: RecipeIllustrationPagePlan[] = Array.from(
    { length: pageCount },
    (_, pageOffset) => {
      const index = pageOffset + 1
      return {
        index,
        isFirst: index === 1,
        isFinal: index === pageCount,
        marker: `第${index}/${pageCount}页`,
        displayIngredients:
          index === 1 ? compactIngredients(recipe.ingredients) : [],
        steps: recipe.steps
          .slice(
            pageOffset * MAX_STEPS_PER_PAGE,
            index * MAX_STEPS_PER_PAGE,
          )
          .map((step) => ({ ...step })),
      }
    },
  )
  return { recipe, pages }
}
