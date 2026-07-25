export interface DemoWorldSnapshot {
  inventory: Array<{
    name: string
    quantity: string
    category: string
    expiryLevel: 'normal' | 'soon' | 'urgent'
  }>
  plannedMeals: Array<{
    day: string
    meal: 'dinner'
    recipeName: string
  }>
  missingItems: string[]
  availableRecipes: Array<{
    id: string
    name: string
  }>
}

export interface DemoAgentResponse {
  answer: string
  suggestions?: Array<{
    title: string
    reason: string
    recipeId?: string
  }>
  notices?: string[]
}

export interface DemoAgentInput {
  mode: 'agent' | 'recommend'
  message?: string
  snapshot: DemoWorldSnapshot
}
