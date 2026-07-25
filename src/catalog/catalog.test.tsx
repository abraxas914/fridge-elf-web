import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const catalogRoot = resolve(process.cwd(), 'src/catalog')
const fixturePath = resolve(process.cwd(), 'src/fixtures/goldenFixture.ts')

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

const foodKeys = [
  'cabbage',
  'carrot',
  'tomato',
  'cucumber',
  'potato',
  'onion',
  'apple',
  'banana',
  'grape',
  'strawberry',
  'beef',
  'chicken',
  'salmon',
  'shrimp',
  'egg',
  'milk',
  'cheese',
  'butter',
] as const

const pixelIconNames = [
  'home',
  'family',
  'roomie',
  'person',
  'person-a',
  'person-b',
  'person-c',
  'kid',
  'plus',
  'pet-cat',
  'pet-dog',
  'pet-rabbit',
  'spice',
  'pot',
  'leaf',
  'dumbbell',
  'balance',
  'run',
  'rice',
  'clock',
  'calendar',
  'alert',
  'camera',
  'moon',
  'bot',
  'mealbox',
  'weather',
  'apple',
  'noodle',
  'heart',
  'milk',
  'box',
  'mic',
  'sound',
  'sound-off',
] as const

describe('prototype-owned visual catalogs', () => {
  it('contains all 18 exact 16px food SVGs and the mold overlay', async () => {
    const path = `${catalogRoot}/foodCatalog.ts`
    expect(existsSync(path)).toBe(true)
    if (!existsSync(path)) return

    const { FOOD_SVGS, foodCatalog } = await import('./foodCatalog')
    expect(Object.keys(FOOD_SVGS)).toEqual(foodKeys)
    expect(Object.keys(foodCatalog)).toEqual(foodKeys)
    for (const svg of Object.values(FOOD_SVGS)) {
      expect(svg).toContain('viewBox="0 0 16 16"')
      expect(svg).toContain('shape-rendering="crispEdges"')
    }
    expect(
      sha256(
        Object.entries(FOOD_SVGS)
          .map(([key, svg]) => `${key}\0${svg}`)
          .join('\0'),
      ),
    ).toBe('c9679bf6056c4dbb7184a9a876122c22f3a382d1a4c85227318654326d281118')

    const moldPath = `${catalogRoot}/moldSvgs.tsx`
    expect(existsSync(moldPath)).toBe(true)
    if (!existsSync(moldPath)) return
    const { MOLD_SVG } = await import('./moldSvgs')
    expect(MOLD_SVG).toContain('viewBox="0 0 16 16"')
    expect(sha256(MOLD_SVG)).toBe(
      'f5809b337af8b4c1810168120767e4a43c36936c2772f54b24beeb512c895e7c',
    )
  })

  it('contains the complete exact 32px pixel icon catalog', async () => {
    const path = `${catalogRoot}/pixelIcons.tsx`
    expect(existsSync(path)).toBe(true)
    if (!existsSync(path)) return

    const { PIXEL_ICON_SVGS } = await import('./pixelIcons')
    expect(Object.keys(PIXEL_ICON_SVGS)).toEqual(pixelIconNames)
    for (const svg of Object.values(PIXEL_ICON_SVGS)) {
      expect(svg).toContain('viewBox="0 0 32 32"')
      expect(svg).toContain('shape-rendering="crispEdges"')
    }
    expect(
      sha256(
        Object.entries(PIXEL_ICON_SVGS)
          .map(([key, svg]) => `${key}\0${svg}`)
          .join('\0'),
      ),
    ).toBe('91d541056c66abc5aa0196216e8ac206fb5085d103e614435801668984752b7d')

    const source = readFileSync(path, 'utf8')
    expect(source).not.toContain('dangerouslySetInnerHTML')
    expect(source).not.toContain('.innerHTML')
  })

  it('keeps fixture identities, names, counts, and dates stable', async () => {
    expect(existsSync(fixturePath)).toBe(true)
    if (!existsSync(fixturePath)) return

    const { GOLDEN_FOODS, MESSAGES, RECIPES, SHOP_ITEMS } = await import(
      '../fixtures/goldenFixture'
    )
    expect(GOLDEN_FOODS).toHaveLength(18)
    expect(GOLDEN_FOODS.map((food) => food.id)).toEqual(
      foodKeys.map((key) => `food-${key}`),
    )
    expect(GOLDEN_FOODS.map((food) => food.name)).toEqual([
      '白菜',
      '胡萝卜',
      '番茄',
      '黄瓜',
      '土豆',
      '洋葱',
      '苹果',
      '香蕉',
      '葡萄',
      '草莓',
      '牛肉',
      '鸡腿',
      '三文鱼',
      '虾仁',
      '鸡蛋',
      '牛奶',
      '芝士',
      '黄油',
    ])
    expect(GOLDEN_FOODS[0].expiryDate).toBe('2026-07-29')
    expect(GOLDEN_FOODS[2].expiryDate).toBe('2026-07-25')
    expect(RECIPES).toHaveLength(5)
    expect(SHOP_ITEMS).toHaveLength(5)
    expect(MESSAGES).toHaveLength(3)
  })
})
