import { describe, expect, it } from 'vitest'
import type { RecipeIllustrationRecipe } from './types'
import { buildRecipeIllustrationPlan } from './recipePlan'

function recipe(stepCount: number): RecipeIllustrationRecipe {
  return {
    id: 'recipe-test',
    title: '番茄炒蛋',
    ingredients: [
      { name: '番茄', amount: '2个' },
      { name: '鸡蛋', amount: '3个' },
      { name: '葱花' },
    ],
    steps: Array.from({ length: stepCount }, (_, index) => ({
      order: index + 1,
      action: `执行动作${index + 1}`,
      target: `食材${index + 1}`,
    })),
  }
}

describe('buildRecipeIllustrationPlan', () => {
  it('keeps a four-step recipe on one page without inventing facts', () => {
    const plan = buildRecipeIllustrationPlan(recipe(4))

    expect(plan.pages).toHaveLength(1)
    expect(plan.pages[0]).toMatchObject({
      index: 1,
      isFirst: true,
      isFinal: true,
      marker: '第1/1页',
    })
    expect(plan.pages[0].steps.map((step) => step.order)).toEqual([
      1, 2, 3, 4,
    ])
    expect(plan.recipe.ingredients[2]).toEqual({ name: '葱花' })
    expect(plan.recipe.steps[0]).not.toHaveProperty('time')
    expect(plan.recipe.steps[0]).not.toHaveProperty('heat')
    expect(plan.recipe.steps[0]).not.toHaveProperty('doneness')
  })

  it('uses the minimum 6+3 pagination and preserves a nine-step order', () => {
    const plan = buildRecipeIllustrationPlan(recipe(9))

    expect(plan.pages.map((page) => page.steps.length)).toEqual([6, 3])
    expect(plan.pages.flatMap((page) => page.steps.map((step) => step.order)))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(plan.pages[1]).toMatchObject({
      index: 2,
      isFirst: false,
      isFinal: true,
      marker: '第2/2页',
    })
  })

  it('caps the displayed ingredient area at eight items without dropping source data', () => {
    const input = recipe(2)
    input.ingredients = Array.from({ length: 10 }, (_, index) => ({
      name: `食材${index + 1}`,
    }))

    const plan = buildRecipeIllustrationPlan(input)

    expect(plan.recipe.ingredients).toHaveLength(10)
    expect(plan.pages[0].displayIngredients).toHaveLength(8)
    expect(plan.pages[0].displayIngredients[7].name).toContain('其他食材')
    expect(plan.pages[0].displayIngredients[7].name).toContain('食材8')
    expect(plan.pages[0].displayIngredients[7].name).toContain('食材10')
  })
})
