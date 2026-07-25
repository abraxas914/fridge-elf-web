import { describe, expect, it } from 'vitest'
import {
  DEMO_RECIPE_CATEGORIES,
  DEMO_RECIPE_SEEDS,
} from './demoRecipeCatalog'

const expectedCategoryCounts = {
  主食: 4,
  凉拌: 3,
  卤菜: 2,
  早餐: 4,
  汤: 3,
  炒菜: 6,
  炖菜: 4,
  炸品: 3,
  烤类: 1,
  烫菜: 3,
  煮锅: 3,
  砂锅菜: 3,
  蒸菜: 4,
  配料: 3,
  饮品: 4,
} as const

describe('demo recipe catalog', () => {
  it('contains fifty stable recipes covering all fifteen categories', () => {
    expect(DEMO_RECIPE_CATEGORIES).toHaveLength(15)
    expect(DEMO_RECIPE_SEEDS).toHaveLength(50)
    expect(new Set(DEMO_RECIPE_SEEDS.map((recipe) => recipe.id)).size).toBe(50)
    expect(new Set(DEMO_RECIPE_SEEDS.map((recipe) => recipe.category))).toEqual(
      new Set(DEMO_RECIPE_CATEGORIES),
    )

    const actualCounts = Object.fromEntries(
      DEMO_RECIPE_CATEGORIES.map((category) => [
        category,
        DEMO_RECIPE_SEEDS.filter((recipe) => recipe.category === category)
          .length,
      ]),
    )
    expect(actualCounts).toEqual(expectedCategoryCounts)
  })

  it('ships complete structured ingredients and real steps', () => {
    for (const recipe of DEMO_RECIPE_SEEDS) {
      expect(recipe.id).toMatch(/^recipe-[a-z0-9-]+$/)
      expect(recipe.source).toBe('seed')
      expect(recipe.ingredients.length).toBeGreaterThan(0)
      expect(recipe.steps.length).toBeGreaterThanOrEqual(3)
      expect(recipe.steps.length).toBeLessThanOrEqual(8)
      expect(recipe.need.length).toBeGreaterThan(0)
      expect(recipe.cn.length).toBeLessThanOrEqual(12)
    }
  })

  it('does not ship source branding, markup, urls, or supplier copy', () => {
    const prohibitedBrand = ['老', '乡', '鸡'].join('')
    const serialized = JSON.stringify(DEMO_RECIPE_SEEDS)

    expect(serialized).not.toContain(prohibitedBrand)
    expect(serialized).not.toMatch(/https?:\/\//i)
    expect(serialized).not.toMatch(/<\/?[a-z][^>]*>/i)
    expect(serialized).not.toMatch(/供应商|来自.{2,20}(食品|生物|餐饮)|门店|套餐/)
  })

  it('uses colorful catalog art for recipes with matching hero ingredients', () => {
    const byId = new Map(
      DEMO_RECIPE_SEEDS.map((recipe) => [recipe.id, recipe]),
    )

    expect(byId.get('recipe-braised-eggplant')?.key).toBe('eggplant')
    expect(byId.get('recipe-steamed-pumpkin')?.key).toBe('pumpkin')
    expect(byId.get('recipe-celery-peanuts')?.key).toBe('celery')
    expect(byId.get('recipe-apple-hawthorn-black-tea')?.ingredients)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ key: 'tea' }),
      ]))
  })
})
