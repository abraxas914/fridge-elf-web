import type { AssistantReply } from '../bridge/types'
import type { PlannerState } from '../app/types'

export interface DemoWorldSnapshot {
  inventory: Array<{
    name: string
    quantity: string
    category: string
    expiryLevel: 'normal' | 'soon' | 'urgent'
  }>
  plannedMeals: Array<{
    day: string
    meal: 'breakfast' | 'lunch' | 'dinner'
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

export type DemoAssistantIntent =
  | 'inventory-voice'
  | 'shopping-voice'

export interface DemoAssistantInventoryItem {
  name: string
  quantity: string
  storage: string
  addedDate: string
  expiryDate: string
  status: string
}

export interface DemoAssistantInput {
  intent?: DemoAssistantIntent
  question: string
  inventory?: readonly DemoAssistantInventoryItem[]
  profile?: unknown
  planner?: PlannerState
  missingItems?: readonly string[]
  snapshot?: DemoWorldSnapshot
}

export interface DemoAssistantReply extends AssistantReply {
  existingRecipeIds: string[]
  notices?: string[]
}

export interface DemoCapabilities {
  assistant: 'managed'
  recipeIllustration: 'managed'
  speechRecognition: 'managed'
}
