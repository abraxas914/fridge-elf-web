import { defaultFavoriteRecipes, type SavedRecipe } from './recipes'
import type { ClockPort } from './ports'
import {
  PLANNER_DAY_KEYS,
  PLANNER_MEAL_KEYS,
  type AppState,
  type AppTab,
  type DisplayMode,
  type PlannerDayKey,
  type PlannerDayState,
  type PlannerMealKey,
  type PlannerState,
} from './types'

export type AppAction =
  | { type: 'enter-app' }
  | { type: 'select-tab'; tab: AppTab }
  | { type: 'open-modal'; kind: string; payload?: unknown }
  | { type: 'close-modal' }
  | { type: 'show-toast'; message: string }
  | { type: 'hide-toast' }
  | { type: 'set-muted'; muted: boolean }
  | { type: 'set-reduced-motion'; reduced: boolean }
  | { type: 'set-display-mode'; mode: DisplayMode }
  | { type: 'begin-note'; text: string }
  | { type: 'reveal-note'; text: string }
  | {
      type: 'assign-recipe'
      day: PlannerDayKey
      meal: PlannerMealKey
      recipeId: string
    }
  | { type: 'clear-recipe'; day: PlannerDayKey; meal: PlannerMealKey }

export const emptyPlannerDay = (): PlannerDayState =>
  Object.fromEntries(
    PLANNER_MEAL_KEYS.map((meal) => [meal, null]),
  ) as PlannerDayState

export const emptyPlanner = (): PlannerState =>
  Object.fromEntries(
    PLANNER_DAY_KEYS.map((day) => [day, emptyPlannerDay()]),
  ) as PlannerState

function loadPlanner(): PlannerState {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem('fridge-planner-v2') ??
        localStorage.getItem('fridge-planner-v1') ??
        'null',
    )
    if (saved && typeof saved === 'object') {
      const values = saved as Record<string, unknown>
      const planner = emptyPlanner()
      for (const day of PLANNER_DAY_KEYS) {
        const value = values[day]
        if (typeof value === 'string') {
          planner[day].dinner = value
        } else if (value && typeof value === 'object') {
          const meals = value as Record<string, unknown>
          for (const meal of PLANNER_MEAL_KEYS) {
            planner[day][meal] =
              typeof meals[meal] === 'string' ? meals[meal] : null
          }
        }
      }
      return planner
    }
  } catch {
    // Start with an empty week when storage is unavailable.
  }
  return emptyPlanner()
}

export const initialAppState: AppState = {
  scene: 'kitchen',
  currentTab: 'fridge',
  modal: null,
  toast: null,
  muted: false,
  reducedMotion: false,
  displayMode: 'home',
  noteText: '',
  visibleNoteText: '',
  planner: loadPlanner(),
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'enter-app':
      return { ...state, scene: 'app', currentTab: 'fridge' }
    case 'select-tab':
      return { ...state, currentTab: action.tab }
    case 'open-modal':
      return {
        ...state,
        modal: { kind: action.kind, payload: action.payload },
      }
    case 'close-modal':
      return { ...state, modal: null }
    case 'show-toast':
      return { ...state, toast: action.message }
    case 'hide-toast':
      return { ...state, toast: null }
    case 'set-muted':
      return { ...state, muted: action.muted }
    case 'set-reduced-motion':
      return { ...state, reducedMotion: action.reduced }
    case 'set-display-mode':
      return { ...state, displayMode: action.mode }
    case 'begin-note':
      return {
        ...state,
        noteText: action.text,
        visibleNoteText: state.reducedMotion ? action.text : '',
        displayMode: 'note',
      }
    case 'reveal-note':
      return { ...state, visibleNoteText: action.text }
    case 'assign-recipe':
      return {
        ...state,
        planner: {
          ...state.planner,
          [action.day]: {
            ...state.planner[action.day],
            [action.meal]: action.recipeId,
          },
        },
      }
    case 'clear-recipe':
      return {
        ...state,
        planner: {
          ...state.planner,
          [action.day]: {
            ...state.planner[action.day],
            [action.meal]: null,
          },
        },
      }
  }
}

export function deriveMissingIngredients(
  planner: PlannerState,
  inventoryValues: readonly string[],
  recipes: readonly SavedRecipe[] = defaultFavoriteRecipes(),
) {
  const have = new Set(
    inventoryValues.map((value) =>
      value.trim().toLocaleLowerCase('zh-CN'),
    ),
  )
  const missing = new Set<string>()
  const labels: Record<string, string> = {
    rice: '米/藜麦',
    oat: '燕麦',
  }

  for (const day of Object.values(planner)) {
    for (const recipeId of Object.values(day)) {
      if (recipeId === null) continue
      const recipe = recipes.find((candidate) => candidate.id === recipeId)
      if (!recipe) continue
      for (const key of recipe.need) {
        const normalized = key.trim().toLocaleLowerCase('zh-CN')
        if (!have.has(normalized)) missing.add(labels[key] ?? key)
      }
    }
  }

  return [...missing]
}

export function createDisplaySleepController(
  clock: ClockPort,
  dispatch: (action: AppAction) => void,
) {
  let timer: number | null = null

  return {
    schedule() {
      if (timer !== null) clock.clearTimeout(timer)
      timer = clock.setTimeout(() => {
        timer = null
        dispatch({ type: 'set-display-mode', mode: 'sleep' })
      }, 15_000)
    },
    cancel() {
      if (timer !== null) clock.clearTimeout(timer)
      timer = null
    },
  }
}

export function createTypewriterController(
  clock: ClockPort,
  dispatch: (action: AppAction) => void,
  reducedMotion: boolean,
) {
  let timer: number | null = null

  return {
    start(text: string) {
      if (timer !== null) clock.clearTimeout(timer)
      dispatch({ type: 'begin-note', text })
      if (reducedMotion || text.length === 0) {
        dispatch({ type: 'reveal-note', text })
        timer = null
        return
      }

      let index = 0
      const revealNext = () => {
        index += 1
        dispatch({ type: 'reveal-note', text: text.slice(0, index) })
        timer =
          index < text.length ? clock.setTimeout(revealNext, 55) : null
      }
      timer = clock.setTimeout(revealNext, 55)
    },
    cancel() {
      if (timer !== null) clock.clearTimeout(timer)
      timer = null
    },
  }
}
