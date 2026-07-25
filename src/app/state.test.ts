import { describe, expect, it } from 'vitest'
import type { ClockPort } from './ports'
import {
  appReducer,
  createInitialAppState,
  createDisplaySleepController,
  createTypewriterController,
  deriveMissingIngredients,
  initialAppState,
  type AppAction,
} from './state'
import { createMemoryStorage } from '../demo/memoryStorage'
import { TAB_ORDER, type AppState } from './types'

class FakeClock implements ClockPort {
  private time = 0
  private nextId = 1
  private tasks = new Map<number, { at: number; callback: () => void }>()

  now() {
    return new Date('2026-07-24T12:00:00+08:00')
  }

  setTimeout(callback: () => void, delayMs: number) {
    const id = this.nextId++
    this.tasks.set(id, { at: this.time + delayMs, callback })
    return id
  }

  clearTimeout(id: number) {
    this.tasks.delete(id)
  }

  advance(delayMs: number) {
    const end = this.time + delayMs
    while (true) {
      const next = [...this.tasks.entries()]
        .filter(([, task]) => task.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0]
      if (!next) break
      this.time = next[1].at
      this.tasks.delete(next[0])
      next[1].callback()
    }
    this.time = end
  }
}

describe('Life Helper state', () => {
  it('loads planner state from the injected demo store', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      'fridge-planner-v2',
      JSON.stringify({
        mon: {
          breakfast: null,
          lunch: null,
          dinner: 'recipe-tomato-egg-bowl',
        },
      }),
    )

    expect(createInitialAppState(storage).planner.mon.dinner).toBe(
      'recipe-tomato-egg-bowl',
    )
  })

  it('enters the app on the fridge tab and keeps the HTML tab order', () => {
    expect(TAB_ORDER).toEqual(['shop', 'recipe', 'fridge', 'note', 'me'])
    const state = appReducer(initialAppState, { type: 'enter-app' })
    expect(state.scene).toBe('app')
    expect(state.currentTab).toBe('fridge')
  })

  it('selects tabs and opens or closes the shared modal', () => {
    const recipe = appReducer(initialAppState, {
      type: 'select-tab',
      tab: 'recipe',
    })
    const open = appReducer(recipe, {
      type: 'open-modal',
      kind: 'recipe-detail',
      payload: { id: 'recipe-tomato-egg-bowl' },
    })
    expect(open.currentTab).toBe('recipe')
    expect(open.modal).toEqual({
      kind: 'recipe-detail',
      payload: { id: 'recipe-tomato-egg-bowl' },
    })
    expect(appReducer(open, { type: 'close-modal' }).modal).toBeNull()
  })

  it('keeps toast, mute, and reduced-motion state deterministic', () => {
    const toasted = appReducer(initialAppState, {
      type: 'show-toast',
      message: '✓ 已加入周菜谱',
    })
    const muted = appReducer(toasted, { type: 'set-muted', muted: true })
    const reduced = appReducer(muted, {
      type: 'set-reduced-motion',
      reduced: true,
    })
    expect(reduced.toast).toBe('✓ 已加入周菜谱')
    expect(reduced.muted).toBe(true)
    expect(reduced.reducedMotion).toBe(true)
    expect(appReducer(reduced, { type: 'hide-toast' }).toast).toBeNull()
  })

  it('returns the display to sleep after the exact HTML 15-second timer', () => {
    const clock = new FakeClock()
    let state: AppState = {
      ...initialAppState,
      displayMode: 'awake',
    }
    const dispatch = (action: AppAction) => {
      state = appReducer(state, action)
    }
    const sleep = createDisplaySleepController(clock, dispatch)

    sleep.schedule()
    clock.advance(14_999)
    expect(state.displayMode).toBe('awake')
    clock.advance(1)
    expect(state.displayMode).toBe('sleep')
  })

  it('reveals note text every 55ms and completes without real sleeps', () => {
    const clock = new FakeClock()
    let state = initialAppState
    const dispatch = (action: AppAction) => {
      state = appReducer(state, action)
    }
    const typewriter = createTypewriterController(clock, dispatch, false)

    typewriter.start('你好')
    expect(state.visibleNoteText).toBe('')
    clock.advance(55)
    expect(state.visibleNoteText).toBe('你')
    clock.advance(55)
    expect(state.visibleNoteText).toBe('你好')
  })

  it('reveals the complete note immediately in reduced motion', () => {
    const clock = new FakeClock()
    let state = { ...initialAppState, reducedMotion: true }
    const typewriter = createTypewriterController(
      clock,
      (action) => {
        state = appReducer(state, action)
      },
      true,
    )

    typewriter.start('记得吃水果')
    expect(state.visibleNoteText).toBe('记得吃水果')
  })

  it('assigns, replaces, and clears planner recipes', () => {
    const assigned = appReducer(initialAppState, {
      type: 'assign-recipe',
      day: 'wed',
      meal: 'dinner',
      recipeId: 'recipe-tomato-egg-bowl',
    })
    const replaced = appReducer(assigned, {
      type: 'assign-recipe',
      day: 'wed',
      meal: 'dinner',
      recipeId: 'recipe-salmon-rice',
    })
    expect(replaced.planner.wed.dinner).toBe('recipe-salmon-rice')
    expect(
      appReducer(replaced, {
        type: 'clear-recipe',
        day: 'wed',
        meal: 'dinner',
      }).planner.wed.dinner,
    ).toBeNull()
  })

  it('keeps breakfast, lunch, and dinner assignments independent', () => {
    const breakfast = appReducer(initialAppState, {
      type: 'assign-recipe',
      day: 'mon',
      meal: 'breakfast',
      recipeId: 'recipe-banana-pancake',
    })
    const dinner = appReducer(breakfast, {
      type: 'assign-recipe',
      day: 'mon',
      meal: 'dinner',
      recipeId: 'recipe-tomato-egg-bowl',
    })

    expect(dinner.planner.mon).toEqual({
      breakfast: 'recipe-banana-pancake',
      lunch: null,
      dinner: 'recipe-tomato-egg-bowl',
    })
  })

  it('uses the approved calendar display mode', () => {
    const state = appReducer(initialAppState, {
      type: 'set-display-mode',
      mode: 'calendar',
    })

    expect(state.displayMode).toBe('calendar')
  })

  it('derives only missing planner ingredients in HTML order', () => {
    const planned = appReducer(initialAppState, {
      type: 'assign-recipe',
      day: 'wed',
      meal: 'dinner',
      recipeId: 'recipe-salmon-rice',
    })
    const withBreakfast = appReducer(planned, {
      type: 'assign-recipe',
      day: 'thu',
      meal: 'breakfast',
      recipeId: 'recipe-banana-pancake',
    })

    expect(
      deriveMissingIngredients(withBreakfast.planner, [
        'salmon',
        'cucumber',
        'banana',
        'egg',
      ]),
    ).toEqual(['米/藜麦', '燕麦'])
  })
})
