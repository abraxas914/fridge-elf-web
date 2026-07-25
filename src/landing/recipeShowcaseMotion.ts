const recipeShowcaseSequence = [1, 0, 2, 3] as const

export function getRecipeShowcaseIndex(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress))
  const stage = Math.min(
    recipeShowcaseSequence.length - 1,
    Math.floor(clamped * recipeShowcaseSequence.length),
  )
  return recipeShowcaseSequence[stage]
}
