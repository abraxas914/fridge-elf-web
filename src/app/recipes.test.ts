import { describe, expect, it } from 'vitest'
import { createMemoryStorage } from '../demo/memoryStorage'
import { RECIPES } from '../fixtures/goldenFixture'
import {
  defaultFavoriteRecipes,
  loadFavoriteRecipes,
  mergeRecipeSeeds,
  type SavedRecipe,
} from './recipes'

const customRecipe = (
  id: string,
  source: SavedRecipe['source'] = 'user',
): SavedRecipe => ({
  id,
  key: 'unknown',
  name: 'CUSTOM',
  cn: '自建食谱',
  kcal: null,
  time: 10,
  tags: ['自定义'],
  match: false,
  need: [],
  desc: '用户内容',
  steps: ['准备食材', '完成烹饪', '装盘享用'],
  source,
})

describe('favorite recipe storage', () => {
  it('adds missing canonical seeds to old local storage', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      'fridge-favorite-recipes-v1',
      JSON.stringify(RECIPES.slice(0, 5)),
    )

    expect(loadFavoriteRecipes(storage)).toHaveLength(55)
    expect(loadFavoriteRecipes(storage).map((recipe) => recipe.id)).toEqual(
      RECIPES.map((recipe) => recipe.id),
    )
  })

  it('refreshes canonical seed content by stable id', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      'fridge-favorite-recipes-v1',
      JSON.stringify([
        {
          ...RECIPES[0],
          cn: '过期标题',
          desc: '过期内容',
        },
      ]),
    )

    const loaded = loadFavoriteRecipes(storage)
    expect(loaded[0].cn).toBe(RECIPES[0].cn)
    expect(loaded[0].desc).toBe(RECIPES[0].desc)
  })

  it('preserves user and assistant recipes', () => {
    const userRecipe = customRecipe('favorite-user')
    const assistantRecipe = customRecipe('assistant-saved', 'assistant')
    const result = mergeRecipeSeeds([userRecipe, assistantRecipe])

    expect(result.slice(-2)).toEqual([userRecipe, assistantRecipe])
  })

  it('does not mutate parsed storage records', () => {
    const stored = customRecipe('favorite-original')
    const result = mergeRecipeSeeds([stored])

    expect(result.at(-1)).not.toBe(stored)
    expect(result.at(-1)?.steps).not.toBe(stored.steps)
    expect(stored).toEqual(customRecipe('favorite-original'))
  })

  it('returns cloned canonical seeds when storage is invalid', () => {
    const storage = createMemoryStorage()
    storage.setItem('fridge-favorite-recipes-v1', '{not-json')

    const first = loadFavoriteRecipes(storage)
    const second = defaultFavoriteRecipes()

    expect(first).toHaveLength(55)
    expect(first).toEqual(second)
    expect(first[0]).not.toBe(second[0])
  })
})
