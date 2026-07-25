import { describe, expect, it } from 'vitest'
import { emptyPlanner } from '../app/state'
import { RECIPES } from '../fixtures/goldenFixture'
import { GOLDEN_PRESENTED_FOODS } from '../scenes/fridge/foodPresentation'
import { buildDemoWorldSnapshot } from './demoWorld'

describe('Demo world snapshot', () => {
  it('maps only allowed inventory fields and expiry levels', () => {
    const snapshot = buildDemoWorldSnapshot({
      inventory: GOLDEN_PRESENTED_FOODS,
      planner: emptyPlanner(),
      missingItems: ['燕麦'],
    })

    expect(snapshot.inventory).toHaveLength(18)
    expect(snapshot.inventory.find((food) => food.name === '番茄')).toEqual({
      name: '番茄',
      quantity: '4个',
      category: 'ingredient',
      expiryLevel: 'urgent',
    })
    expect(snapshot.inventory.find((food) => food.name === '香蕉')).toEqual({
      name: '香蕉',
      quantity: '3根',
      category: 'ingredient',
      expiryLevel: 'soon',
    })
    expect(snapshot.inventory[0]).not.toHaveProperty('id')
    expect(snapshot.inventory[0]).not.toHaveProperty('expiryDate')
    expect(snapshot.missingItems).toEqual(['燕麦'])
  })

  it('includes planned meals and only the existing recipe catalogue', () => {
    const planner = emptyPlanner()
    planner.mon = 'recipe-tomato-egg-bowl'
    planner.tue = 'recipe-not-found'

    const snapshot = buildDemoWorldSnapshot({
      inventory: [],
      planner,
      missingItems: [],
    })

    expect(snapshot.plannedMeals).toEqual([
      {
        day: 'mon',
        meal: 'dinner',
        recipeName: '番茄鸡蛋轻食碗',
      },
    ])
    expect(snapshot.availableRecipes).toEqual(
      RECIPES.map((recipe) => ({ id: recipe.id, name: recipe.cn })),
    )
    expect(snapshot).not.toHaveProperty('profile')
  })
})
