import { describe, expect, it } from 'vitest'
import { recipeShowcase } from './recipeShowcase'

describe('recipeShowcase', () => {
  it('exposes only four neutral image paths', () => {
    expect(Object.keys(recipeShowcase)).toEqual(['images'])
    expect(recipeShowcase.images).toEqual([
      '/assets/recipe/recipe-sample-01.webp',
      '/assets/recipe/recipe-sample-02.webp',
      '/assets/recipe/recipe-sample-03.webp',
      '/assets/recipe/recipe-sample-04.webp',
    ])
    expect(JSON.stringify(recipeShowcase)).not.toMatch(
      /name|style|description|tag|skill|小黑/i,
    )
  })
})
