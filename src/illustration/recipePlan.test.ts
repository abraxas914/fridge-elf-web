import { describe, expect, it } from 'vitest'
import {
  buildIllustrationPrompt,
  compileRecipePlan,
  ILLUSTRATION_STYLES,
} from './recipePlan'

const NINE_STEP_RECIPE = `# 番茄鸡蛋面
份量：2人份

## 食材
- 番茄：2个
- 鸡蛋：2个
- 面条：200克
- 食用油：适量
- 盐：少许
- 生抽：1勺
- 葱：1根
- 白胡椒：少许
- 香油：少许

## 步骤
1. 番茄洗净切块。
2. 鸡蛋打入碗中搅匀。
3. 锅中倒油，中火炒鸡蛋后盛出。
4. 放入番茄翻炒。
5. 加水煮开。
6. 放入面条煮3分钟。
7. 加入炒好的鸡蛋。
8. 放盐和生抽调味。
9. 盛入碗中，撒葱花。`

describe('compileRecipePlan', () => {
  it('keeps recipe facts, compresses ingredients, and paginates 6 + 3', () => {
    const plan = compileRecipePlan(NINE_STEP_RECIPE)

    expect(plan.title).toBe('番茄鸡蛋面')
    expect(plan.servings).toBe('2人份')
    expect(plan.ingredients).toHaveLength(8)
    expect(plan.ingredients.at(-1)?.name).toContain('其他调味料')
    expect(plan.ingredients.at(-1)?.name).toContain('香油')
    expect(plan.steps).toHaveLength(9)
    expect(plan.pages.map((page) => page.steps)).toEqual([
      [1, 2, 3, 4, 5, 6],
      [7, 8, 9],
    ])
    expect(plan.pages[0]).toMatchObject({
      isFirst: true,
      isFinal: false,
      pageMarker: '第1/2页',
    })
    expect(plan.pages[1]).toMatchObject({
      isFirst: false,
      isFinal: true,
      pageMarker: '第2/2页',
    })
  })

  it('does not invent missing amount, time, heat, or doneness', () => {
    const plan = compileRecipePlan(`# 凉拌黄瓜
食材：
- 黄瓜
- 盐
步骤：
1. 黄瓜拍开。
2. 加盐拌匀。`)

    expect(plan.ingredients).toEqual([
      { name: '黄瓜', amount: '' },
      { name: '盐', amount: '' },
    ])
    expect(plan.steps.every((step) => step.time === '')).toBe(true)
    expect(plan.steps.every((step) => step.heat === '')).toBe(true)
    expect(plan.steps.every((step) => step.doneness === '')).toBe(true)
  })

  it('rejects input without a title, ingredients, or ordered steps', () => {
    expect(() => compileRecipePlan('今晚随便吃点什么')).toThrow(
      /食材和编号步骤/,
    )
  })
})

describe('illustration prompt runtime', () => {
  it('exposes exactly the four accepted skill styles', () => {
    expect(ILLUSTRATION_STYLES.map((style) => style.id)).toEqual([
      'xiaohei',
      'watercolor',
      'linen-zine',
      'pixel-doodle',
    ])
  })

  it('locks exact Chinese and applies the selected skill DNA per page', () => {
    const plan = compileRecipePlan(NINE_STEP_RECIPE)
    const prompt = buildIllustrationPrompt(plan, 'watercolor', 2)

    expect(prompt).toContain('exactly 1200×1440 pixels')
    expect(prompt).toContain('"番茄鸡蛋面"')
    expect(prompt).toContain('"第2/2页"')
    expect(prompt).toContain('Xiaoci')
    expect(prompt).toContain('#FDF6EC')
    expect(prompt).toContain('7. ')
    expect(prompt).toContain('8. ')
    expect(prompt).toContain('9. ')
    expect(prompt).not.toContain('1. 番茄洗净切块')
    expect(prompt).not.toContain('Ingredient labels when is_first=true')
  })
})
