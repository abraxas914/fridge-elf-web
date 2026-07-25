import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('v1 release product surface', () => {
  it('contains the released display, assistant and illustration modules', () => {
    const expected = [
      'src/scenes/display/DisplayScene.tsx',
      'src/scenes/recipe/FavoriteRecipesModal.tsx',
      'src/features/assistant/AssistantResult.tsx',
      'src/features/recipeIllustration/RecipeIllustrationPanel.tsx',
      'src/features/credentials/CredentialCenter.tsx',
    ]
    expected.forEach((path) => {
      expect(existsSync(resolve(path)), path).toBe(true)
    })
  })
})
