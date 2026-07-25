import { describe, expect, it } from 'vitest'
import { buildRecipeIllustrationPlan } from './recipePlan'
import { buildRecipePagePrompt } from './prompt'
import { RECIPE_ILLUSTRATION_STYLES } from './styles'
import type { RecipeIllustrationRecipe } from './types'

const RECIPE: RecipeIllustrationRecipe = {
  id: 'recipe-tomato-egg',
  title: '番茄炒蛋',
  ingredients: [
    { name: '番茄', amount: '2个' },
    { name: '鸡蛋', amount: '3个' },
  ],
  steps: [
    { order: 1, action: '搅匀鸡蛋', target: '鸡蛋' },
    { order: 2, action: '番茄切块', target: '番茄' },
  ],
}

describe('recipe illustration prompt profiles', () => {
  it('publishes exactly four stable style ids', () => {
    expect(RECIPE_ILLUSTRATION_STYLES.map((style) => style.id)).toEqual([
      'xiaohei',
      'pixel-person',
      'linen-zine',
      'watercolor-kitchen',
    ])
  })

  it.each(RECIPE_ILLUSTRATION_STYLES)(
    'locks dimensions, safe area and exact Chinese for $id',
    (style) => {
      const plan = buildRecipeIllustrationPlan(RECIPE)
      const prompt = buildRecipePagePrompt(plan, plan.pages[0], style.id)

      expect(prompt).toContain('exactly 1200×1440')
      expect(prompt).toContain('10% safe margin')
      expect(prompt).toContain('第1/1页')
      expect(prompt).toContain('"番茄 2个"')
      expect(prompt).toContain('"搅匀鸡蛋"')
      expect(prompt).toContain('1 → 2')
      expect(prompt).toContain('Do not invent')
    },
  )

  it('requires a human pixel cook and forbids horse or animal traits', () => {
    const plan = buildRecipeIllustrationPlan(RECIPE)
    const prompt = buildRecipePagePrompt(
      plan,
      plan.pages[0],
      'pixel-person',
    )

    expect(prompt).toContain('human pixel cook')
    expect(prompt).toContain('human head, torso, two arms, two legs and hands')
    expect(prompt).toContain('no horse')
    expect(prompt).toContain('no animal')
  })

  it('omits the full ingredient block on later pages', () => {
    const longRecipe: RecipeIllustrationRecipe = {
      ...RECIPE,
      steps: Array.from({ length: 7 }, (_, index) => ({
        order: index + 1,
        action: `步骤${index + 1}`,
      })),
    }
    const plan = buildRecipeIllustrationPlan(longRecipe)
    const prompt = buildRecipePagePrompt(plan, plan.pages[1], 'xiaohei')

    expect(prompt).toContain('is_first=false')
    expect(prompt).not.toContain('"番茄 2个"')
    expect(prompt).toContain('"第2/2页"')
  })
})
