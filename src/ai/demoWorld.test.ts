import { describe, expect, it } from 'vitest'
import { emptyPlanner } from '../app/state'
import { RECIPES } from '../fixtures/goldenFixture'
import { GOLDEN_PRESENTED_FOODS } from '../scenes/fridge/foodPresentation'
import { buildDemoWorldSnapshot } from './demoWorld'

describe('Demo world snapshot', () => {
  it('builds a complete versioned inventory context without truncation', () => {
    const snapshot = buildDemoWorldSnapshot({
      inventory: GOLDEN_PRESENTED_FOODS,
      planner: emptyPlanner(),
      missingItems: ['燕麦'],
      profile: {
        living: 'family',
        taste: 'clean',
        fitness: 'balance',
        routine: 'quick',
        health: '乳糖不耐',
      },
    })

    expect(snapshot.contextVersion).toBe(2)
    expect(snapshot.inventory).toHaveLength(18)
    expect(snapshot.inventory.find((food) => food.name === '番茄')).toMatchObject({
      id: 'food-tomato',
      name: '番茄',
      englishName: 'Tomato',
      quantity: '4个',
      category: 'ingredient',
      storage: 'fridge',
      expiryDate: '2026-07-25',
      expiresInDays: 1,
      addedDaysAgo: 2,
      kcal: 18,
      batchCount: 1,
      status: 'fresh',
      expiryLevel: 'urgent',
    })
    expect(snapshot.preferences).toEqual({
      living: 'family',
      taste: 'clean',
      fitness: 'balance',
      routine: 'quick',
      health: '乳糖不耐',
    })
    expect(snapshot.contextMeta).toMatchObject({
      inventoryCount: 18,
      plannedMealCount: 0,
      missingItemCount: 1,
      recipeCount: RECIPES.length,
      truncated: false,
      omittedCount: 0,
    })
    expect(snapshot.contextMeta.serializedBytes).toBeGreaterThan(1_000)
    expect(snapshot.missingItems).toEqual(['燕麦'])
  })

  it('includes every meal slot and the detailed recipe catalogue', () => {
    const planner = emptyPlanner()
    planner.mon.dinner = 'recipe-tomato-egg-bowl'
    planner.tue.breakfast = 'recipe-banana-pancake'
    planner.wed.lunch = 'recipe-not-found'

    const snapshot = buildDemoWorldSnapshot({
      inventory: [],
      planner,
      missingItems: [],
    })

    expect(snapshot.plannedMeals).toEqual([
      {
        day: 'mon',
        meal: 'dinner',
        recipeId: 'recipe-tomato-egg-bowl',
        recipeName: '番茄鸡蛋轻食碗',
      },
      {
        day: 'tue',
        meal: 'breakfast',
        recipeId: 'recipe-banana-pancake',
        recipeName: '香蕉燕麦松饼',
      },
    ])
    expect(snapshot.availableRecipes).toHaveLength(RECIPES.length)
    expect(snapshot.availableRecipes[0]).toMatchObject({
      id: 'recipe-tomato-egg-bowl',
      name: '番茄鸡蛋轻食碗',
      englishName: 'TOMATO EGG BOWL',
      description: expect.stringContaining('番茄'),
      kcal: 320,
      timeMinutes: 15,
      tags: ['轻食', '高蛋白'],
      requiredIngredients: ['tomato', 'egg'],
      steps: expect.arrayContaining([expect.stringContaining('番茄')]),
      inventoryMatch: true,
    })
    expect(snapshot.preferences).toEqual({
      living: 'solo',
      taste: 'clean',
      fitness: 'balance',
      routine: 'normal',
      health: '',
    })
  })

  it('normalizes recipes without nutrition data for the Agent contract', () => {
    const snapshot = buildDemoWorldSnapshot({
      inventory: [],
      planner: emptyPlanner(),
      missingItems: [],
    })

    expect(
      snapshot.availableRecipes.find(
        (recipe) => recipe.id === 'recipe-tomato-egg-noodles',
      ),
    ).toMatchObject({
      kcal: 0,
      steps: expect.arrayContaining([
        expect.stringContaining('番茄汤底'),
      ]),
    })
  })
})
