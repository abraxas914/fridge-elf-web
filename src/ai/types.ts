import type { AssistantReply } from '../bridge/types'
import type { PlannerState } from '../app/types'

export interface DemoWorldSnapshot {
  contextVersion: 2
  inventory: Array<{
    id: string
    name: string
    englishName: string
    quantity: string
    category: string
    kcal: number | null
    storage: string
    expiryDate: string
    expiresInDays: number | null
    addedDate: string
    addedDaysAgo: number | null
    batchCount: number
    status: string
    expiryLevel: 'normal' | 'soon' | 'urgent'
  }>
  plannedMeals: Array<{
    day: string
    meal: 'breakfast' | 'lunch' | 'dinner'
    recipeId: string
    recipeName: string
  }>
  missingItems: string[]
  availableRecipes: Array<{
    id: string
    name: string
    englishName: string
    description: string
    kcal: number
    timeMinutes: number
    tags: string[]
    requiredIngredients: string[]
    steps: string[]
    inventoryMatch: boolean
  }>
  preferences: DemoPreferences
  contextMeta: DemoContextMeta
}

export interface DemoPreferences {
  living: 'solo' | 'family' | 'roomie'
  taste: 'spicy' | 'hunan' | 'clean' | 'custom'
  fitness: 'gain' | 'balance' | 'light'
  routine: 'normal' | 'quick' | 'plan'
  health: string
}

export interface DemoContextMeta {
  contextVersion: 2
  serializedBytes: number
  inventoryCount: number
  plannedMealCount: number
  missingItemCount: number
  recipeCount: number
  truncated: false
  omittedCount: 0
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
