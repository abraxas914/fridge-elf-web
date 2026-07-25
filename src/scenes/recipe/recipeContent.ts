import type { RecipeIllustrationRecipe } from '../../features/recipeIllustration/types'
import type { RecipeIngredient } from '../../app/recipes'
import { findFoodCatalogEntry } from '../../catalog/foodCatalog'
import type { Recipe } from './RecipeScene'

const FALLBACK_INGREDIENT_NAMES: Readonly<Record<string, string>> = {
  rice: '米/藜麦',
  oat: '燕麦',
}

function ingredientName(key: string) {
  return (
    findFoodCatalogEntry(key)?.name ??
    FALLBACK_INGREDIENT_NAMES[key] ??
    key
  )
}

export function recipeDisplaySteps(recipe: Recipe): string[] {
  if (recipe.steps?.length) return [...recipe.steps]
  const names = recipeIngredients(recipe).map((item) => item.name)
  return [
    `取出 ${names.slice(0, 2).join(' + ')}，先清洗并切成小块。`,
    '热锅少油，先下需要久煮的食材，再加入主料翻炒。',
    '加入调味并小火收汁，按你的饮食模式减少油盐。',
    '出锅前尝味，搭配冰箱里的新鲜蔬菜一起吃。',
  ]
}

export function recipeIngredients(recipe: Recipe): RecipeIngredient[] {
  if (recipe.ingredients?.length) {
    return recipe.ingredients.map((item) => ({ ...item }))
  }
  return recipe.need.map((value) => {
    const entry = findFoodCatalogEntry(value)
    return {
      ...(entry ? { key: entry.key } : {}),
      name: ingredientName(value),
    }
  })
}

export function toIllustrationRecipe(
  recipe: Recipe,
): RecipeIllustrationRecipe {
  const ingredients = recipeIngredients(recipe)
  if (recipe.steps?.length) {
    return {
      id: recipe.id,
      title: recipe.cn,
      ingredients: ingredients.map(({ name, amount }) => ({
        name,
        ...(amount ? { amount } : {}),
      })),
      steps: recipe.steps.map((action, index) => ({
        order: index + 1,
        action,
      })),
    }
  }
  const names = ingredients.map((item) => item.name)
  return {
    id: recipe.id,
    title: recipe.cn,
    ingredients: ingredients.map(({ name, amount }) => ({
      name,
      ...(amount ? { amount } : {}),
    })),
    steps: [
      {
        order: 1,
        action: '清洗切块',
        target: names.slice(0, 2).join('、'),
      },
      {
        order: 2,
        action: '少油翻炒',
        target: '食材',
      },
      {
        order: 3,
        action: '调味收汁',
        heat: '小火',
      },
      {
        order: 4,
        action: '尝味出锅',
        doneness: '熟透即可',
      },
    ],
  }
}
