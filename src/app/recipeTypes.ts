import type { FoodKey } from '../catalog/foodCatalog'

export const RECIPE_CATEGORIES = [
  '主食',
  '凉拌',
  '卤菜',
  '早餐',
  '汤',
  '炒菜',
  '炖菜',
  '炸品',
  '烤类',
  '烫菜',
  '煮锅',
  '砂锅菜',
  '蒸菜',
  '配料',
  '饮品',
] as const

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number]

export interface RecipeIngredient {
  key?: FoodKey
  name: string
  amount?: string
}

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
  category?: RecipeCategory
  ingredients?: readonly RecipeIngredient[]
  source?: 'seed' | 'user' | 'assistant'
}
