import { useState } from 'react'
import type { AudioCue } from '../../app/ports'
import type { PlannerDayKey, PlannerState } from '../../app/types'
import { FOOD_SVGS } from '../../catalog/foodCatalog'
import { PixelIcon, svgDataUrl } from '../../catalog/pixelIcons'
import { PLANNER_DAYS, RECIPES } from '../../fixtures/goldenFixture'
import type { Recipe } from './RecipeScene'

interface MealPlannerModalProps {
  planner: PlannerState
  missingIngredients: readonly string[]
  onAssign: (day: PlannerDayKey, recipe: Recipe) => void
  onClear: (day: PlannerDayKey) => void
  onCue?: (cue: AudioCue) => void
}

export function MealPlannerModal(props: MealPlannerModalProps) {
  const [selectedDay, setSelectedDay] = useState<PlannerDayKey | null>(null)
  if (selectedDay) {
    const day = PLANNER_DAYS.find((candidate) => candidate.key === selectedDay)!
    return (
      <>
        <div className="planner-pick-title">为 <b>周{day.label}</b> 选菜：</div>
        {RECIPES.map((recipe) => (
          <button className="recipe-pick-item" type="button" key={recipe.id} onClick={() => { props.onAssign(selectedDay, recipe); setSelectedDay(null) }}>
            <span className="pi-icon"><img src={svgDataUrl(FOOD_SVGS[recipe.key])} alt="" aria-hidden="true" /></span>
            <span className="pi-info"><span className="pi-cn">{recipe.cn}</span><span className="pi-en">{recipe.name} · {recipe.kcal} KCAL</span></span>
          </button>
        ))}
        {props.planner[selectedDay] !== null ? <button className="planner-subaction clear" type="button" onClick={() => { props.onClear(selectedDay); setSelectedDay(null) }}>✕ 清空这一天</button> : null}
        <button className="planner-subaction back" type="button" onClick={() => setSelectedDay(null)}>← 返回周视图</button>
      </>
    )
  }
  return (
    <>
      <div className="planner-intro">点击某天 → 选菜。系统会自动倒推购物清单。</div>
      <div className="planner-week">
        {PLANNER_DAYS.map((day) => {
          const recipe = RECIPES.find((candidate) => candidate.id === props.planner[day.key])
          const today = 'today' in day && day.today
          return (
            <button className={`planner-day${recipe ? ' has' : today ? ' today' : ''}`} type="button" key={day.key} onClick={() => { props.onCue?.('tick'); setSelectedDay(day.key) }}>
              <span className="dn">周{day.label}</span>
              <span className="dm">{recipe ? <PixelIcon name="rice" className="quick-px" /> : '+'}</span>
              <span className="dt">{recipe ? recipe.cn.slice(0, 4) : today ? '今日' : 'TAP'}</span>
            </button>
          )
        })}
      </div>
      <div className="planner-tip"><b>SHOP · 缺少食材：</b><br />{props.missingIngredients.length ? props.missingIngredients.join(' · ') : '✓ 冰箱够用（或还没开始规划）'}</div>
    </>
  )
}
