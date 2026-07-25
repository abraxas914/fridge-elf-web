import type { FoodKey } from '../catalog/foodCatalog'

export const TAB_ORDER = ['shop', 'recipe', 'fridge', 'note', 'me'] as const
export type AppTab = (typeof TAB_ORDER)[number]

export const DISPLAY_MODES = [
  'home',
  'note',
  'inventory',
  'sleep',
  'awake',
  'meals',
  'calendar',
] as const
export type DisplayMode = (typeof DISPLAY_MODES)[number]

export const PLANNER_DAY_KEYS = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const
export type PlannerDayKey = (typeof PLANNER_DAY_KEYS)[number]

export const PLANNER_MEAL_KEYS = ['breakfast', 'lunch', 'dinner'] as const
export type PlannerMealKey = (typeof PLANNER_MEAL_KEYS)[number]
export type PlannerDayState = Record<PlannerMealKey, string | null>
export type PlannerState = Record<PlannerDayKey, PlannerDayState>

export interface AppModal {
  kind: string
  payload?: unknown
}

export interface AppState {
  scene: 'kitchen' | 'app'
  currentTab: AppTab
  modal: AppModal | null
  toast: string | null
  muted: boolean
  reducedMotion: boolean
  displayMode: DisplayMode
  noteText: string
  visibleNoteText: string
  planner: PlannerState
}

export interface PresentedFood {
  id: string
  sourceIds: readonly string[]
  batches: readonly {
    id: string
    quantity: string
    expiryDate: string
  }[]
  key: FoodKey | 'unknown'
  name: string
  englishName: string
  quantity: string
  storage: string
  expiryDate: string
  addedDate: string
  expiresInDays: number | null
  category: 'ingredient' | 'drink' | 'other' | 'unknown'
  kcal: number | null
  addedDaysAgo: number | null
  batchCount: number
  status: string
  source: 'fixture' | 'native'
}
