export type RecipeIllustrationStyleId =
  | 'xiaohei'
  | 'pixel-person'
  | 'linen-zine'
  | 'watercolor-kitchen'

export interface RecipeIllustrationIngredient {
  name: string
  amount?: string
}

export interface RecipeIllustrationStep {
  order: number
  action: string
  target?: string
  time?: string
  heat?: string
  doneness?: string
}

export interface RecipeIllustrationRecipe {
  id: string
  title: string
  servings?: string
  ingredients: RecipeIllustrationIngredient[]
  steps: RecipeIllustrationStep[]
}

export interface RecipeIllustrationPagePlan {
  index: number
  isFirst: boolean
  isFinal: boolean
  marker: string
  displayIngredients: RecipeIllustrationIngredient[]
  steps: RecipeIllustrationStep[]
}

export interface RecipeIllustrationPlan {
  recipe: RecipeIllustrationRecipe
  pages: RecipeIllustrationPagePlan[]
}

export interface RecipeIllustrationRequest {
  contractVersion: 1
  recipe: RecipeIllustrationRecipe
  styleId: RecipeIllustrationStyleId
  pageIndexes?: number[]
}

export type RecipeIllustrationJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'

export interface RecipeIllustrationJobPage {
  index: number
  imageUrl: string
}

export interface RecipeIllustrationJobError {
  code: string
  message: string
}

export interface RecipeIllustrationJob {
  id: string
  status: RecipeIllustrationJobStatus
  completedPages: number
  totalPages: number
  pages: RecipeIllustrationJobPage[]
  error?: RecipeIllustrationJobError
}
