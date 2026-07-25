import { useState } from 'react'
import type { AudioCue } from '../../app/ports'
import { defaultFavoriteRecipes } from '../../app/recipes'
import {
  PLANNER_MEAL_KEYS,
  type PlannerDayKey,
  type PlannerMealKey,
  type PlannerState,
} from '../../app/types'
import { FOOD_SVGS } from '../../catalog/foodCatalog'
import { PixelIcon, svgDataUrl } from '../../catalog/pixelIcons'
import { PLANNER_DAYS } from '../../fixtures/goldenFixture'
import type { Recipe } from './RecipeScene'

interface MealPlannerModalProps {
  planner: PlannerState
  missingIngredients: readonly string[]
  recipes?: readonly Recipe[]
  onAssign: (
    day: PlannerDayKey,
    meal: PlannerMealKey,
    recipe: Recipe,
  ) => void
  onClear: (day: PlannerDayKey, meal: PlannerMealKey) => void
  onCue?: (cue: AudioCue) => void
}

const MEAL_LABELS: Record<PlannerMealKey, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

export function MealPlannerModal(props: MealPlannerModalProps) {
  const recipes = props.recipes ?? defaultFavoriteRecipes()
  const [selectedDay, setSelectedDay] = useState<PlannerDayKey | null>(null)
  const [selectedMeal, setSelectedMeal] =
    useState<PlannerMealKey | null>(null)

  if (selectedDay && selectedMeal) {
    const day = PLANNER_DAYS.find(
      (candidate) => candidate.key === selectedDay,
    )!
    const assignedId = props.planner[selectedDay][selectedMeal]
    return (
      <>
        <div className="planner-pick-title">
          为 <b>周{day.label} · {MEAL_LABELS[selectedMeal]}</b> 选菜
        </div>
        <div className="recipe-pick-list">
          {recipes.map((recipe) => (
            <button
              className={`recipe-pick-item${
                assignedId === recipe.id ? ' selected' : ''
              }`}
              type="button"
              key={recipe.id}
              onClick={() => {
                props.onCue?.('success')
                props.onAssign(selectedDay, selectedMeal, recipe)
                setSelectedMeal(null)
              }}
            >
              <span className="pi-icon">
                {recipe.key === 'unknown' ? (
                  '菜'
                ) : (
                  <img
                    src={svgDataUrl(FOOD_SVGS[recipe.key])}
                    alt=""
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="pi-info">
                <span className="pi-cn">{recipe.cn}</span>
                <span className="pi-en">
                  {recipe.name} · {recipe.kcal ?? '--'} KCAL
                </span>
              </span>
            </button>
          ))}
        </div>
        {assignedId ? (
          <button
            className="planner-subaction clear"
            type="button"
            onClick={() => {
              props.onCue?.('tick')
              props.onClear(selectedDay, selectedMeal)
              setSelectedMeal(null)
            }}
          >
            清空这顿
          </button>
        ) : null}
        <button
          className="planner-subaction back"
          type="button"
          onClick={() => setSelectedMeal(null)}
        >
          返回三餐
        </button>
      </>
    )
  }

  if (selectedDay) {
    const day = PLANNER_DAYS.find(
      (candidate) => candidate.key === selectedDay,
    )!
    return (
      <>
        <div className="planner-pick-title">
          <b>周{day.label}</b> · 选择要规划的餐次
        </div>
        <div className="planner-meals">
          {PLANNER_MEAL_KEYS.map((meal) => {
            const recipe = recipes.find(
              (candidate) =>
                candidate.id === props.planner[selectedDay][meal],
            )
            return (
              <button
                className={`planner-meal${recipe ? ' has' : ''}`}
                type="button"
                key={meal}
                onClick={() => {
                  props.onCue?.('tick')
                  setSelectedMeal(meal)
                }}
              >
                <span className="planner-meal-label">
                  {MEAL_LABELS[meal]}
                </span>
                <span className="planner-meal-value">
                  {recipe?.cn ?? '点击选择菜品'}
                </span>
                <span className="planner-meal-arrow">›</span>
              </button>
            )
          })}
        </div>
        <button
          className="planner-subaction back"
          type="button"
          onClick={() => setSelectedDay(null)}
        >
          返回周视图
        </button>
      </>
    )
  }

  return (
    <>
      <div className="planner-intro">
        先选日期，再分别规划早餐、午餐和晚餐。购物清单会自动汇总缺少的食材。
      </div>
      <div className="planner-week">
        {PLANNER_DAYS.map((day) => {
          const mealRecipes = PLANNER_MEAL_KEYS.map((meal) =>
            recipes.find(
              (candidate) =>
                candidate.id === props.planner[day.key][meal],
            ),
          )
          const plannedCount = mealRecipes.filter(Boolean).length
          const today = 'today' in day && day.today
          return (
            <button
              className={`planner-day${
                plannedCount ? ' has' : today ? ' today' : ''
              }`}
              type="button"
              key={day.key}
              onClick={() => {
                props.onCue?.('tick')
                setSelectedDay(day.key)
              }}
            >
              <span className="dn">周{day.label}</span>
              <span className="dm">
                {plannedCount ? (
                  <PixelIcon name="rice" className="quick-px" />
                ) : (
                  '+'
                )}
              </span>
              <span className="dt">
                {plannedCount
                  ? `${plannedCount}/3 餐`
                  : today
                    ? '今日'
                    : '规划'}
              </span>
            </button>
          )
        })}
      </div>
      <div className="planner-tip">
        <b>SHOP · 缺少食材：</b>
        <br />
        {props.missingIngredients.length
          ? props.missingIngredients.join(' · ')
          : '冰箱够用（或还没开始规划）'}
      </div>
    </>
  )
}
