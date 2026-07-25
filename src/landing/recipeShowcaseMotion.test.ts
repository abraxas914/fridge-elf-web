import { describe, expect, it } from 'vitest'
import { getRecipeShowcaseIndex } from './recipeShowcaseMotion'

describe('getRecipeShowcaseIndex', () => {
  it.each([
    [-1, 1],
    [0, 1],
    [0.24, 1],
    [0.25, 0],
    [0.5, 2],
    [0.75, 3],
    [1, 3],
    [2, 3],
  ])('maps progress %s to image %s', (progress, imageIndex) => {
    expect(getRecipeShowcaseIndex(progress)).toBe(imageIndex)
  })
})
