import { describe, expect, it } from 'vitest'
import { createMemoryStorage } from '../demo/memoryStorage'
import { loadFavoriteRecipes } from './recipes'

describe('favorite recipe storage', () => {
  it('reads saved recipes from the injected demo store', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      'fridge-favorite-recipes-v1',
      JSON.stringify([
        {
          id: 'saved',
          key: 'unknown',
          name: 'SAVED',
          cn: '已收藏',
          kcal: null,
          time: 10,
          tags: [],
          match: true,
          need: [],
          desc: '会话内收藏',
        },
      ]),
    )

    expect(loadFavoriteRecipes(storage).map((recipe) => recipe.id)).toEqual([
      'saved',
    ])
  })
})
