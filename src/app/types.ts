import type { FoodKey } from '../catalog/foodCatalog'

export const TAB_ORDER = ['shop', 'recipe', 'fridge', 'note', 'me'] as const
export type AppTab = (typeof TAB_ORDER)[number]

export const DISPLAY_MODES = [
  'sleep',
  'awake',
  'voice',
  'meals',
  'calendar',
  'weather',
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

export type PlannerState = Record<PlannerDayKey, string | null>

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
  key: FoodKey | 'unknown'
  name: string
  englishName: string
  quantity: string
  storage: string
  expiryDate: string
  expiresInDays: number | null
  category: 'ingredient' | 'drink' | 'other' | 'unknown'
  kcal: number | null
  addedDaysAgo: number | null
  status: string
  source: 'fixture' | 'native'
}
