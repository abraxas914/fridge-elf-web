import { describe, expect, it } from 'vitest'
import type { SavedRecipe } from '../../app/recipes'
import {
  recipeDisplaySteps,
  recipeIngredients,
  toIllustrationRecipe,
} from './recipeContent'

const structuredRecipe: SavedRecipe = {
  id: 'recipe-structured',
  key: 'tomato',
  name: 'STRUCTURED',
  cn: '结构化食谱',
  kcal: null,
  time: 0,
  tags: ['测试'],
  match: false,
  need: ['tomato'],
  desc: '测试真实食材和步骤',
  ingredients: [{ key: 'tomato', name: '番茄', amount: '2个' }],
  steps: ['番茄洗净切块。', '锅中翻炒番茄。', '调味后装盘。'],
  source: 'seed',
}

describe('recipe content adapters', () => {
  it('returns structured ingredients and real steps first', () => {
    expect(recipeIngredients(structuredRecipe)).toEqual([
      { key: 'tomato', name: '番茄', amount: '2个' },
    ])
    expect(recipeDisplaySteps(structuredRecipe)).toEqual(
      structuredRecipe.steps,
    )
  })

  it('sends structured ingredients and real steps to illustration', () => {
    const illustration = toIllustrationRecipe(structuredRecipe)

    expect(illustration.ingredients).toEqual([
      { name: '番茄', amount: '2个' },
    ])
    expect(illustration.steps.map((step) => step.action)).toEqual(
      structuredRecipe.steps,
    )
  })

  it('keeps legacy need and generic steps as a compatibility fallback', () => {
    const legacyRecipe: SavedRecipe = {
      ...structuredRecipe,
      id: 'favorite-legacy',
      ingredients: undefined,
      steps: undefined,
      need: ['tomato', 'oat'],
    }

    expect(recipeIngredients(legacyRecipe)).toEqual([
      { key: 'tomato', name: '番茄' },
      { name: '燕麦' },
    ])
    expect(recipeDisplaySteps(legacyRecipe)).toHaveLength(4)
    expect(toIllustrationRecipe(legacyRecipe).steps).toHaveLength(4)
  })
})
