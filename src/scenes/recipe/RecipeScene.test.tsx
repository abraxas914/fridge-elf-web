import { act, fireEvent, render, screen } from '@testing-library/react'
import { useReducer } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { appReducer, emptyPlanner } from '../../app/state'
import { RECIPES } from '../../fixtures/goldenFixture'
import { MealPlannerModal } from './MealPlannerModal'
import { RecipeDetailModal } from './RecipeDetailModal'
import { RecipeScene } from './RecipeScene'

describe('RecipeScene', () => {
  it('ports tools, five recommendations, and agent fixture input', () => {
    const onOpenAgent = vi.fn()
    render(
      <RecipeScene
        onOpenRecipe={vi.fn()}
        onOpenPlanner={vi.fn()}
        onOpenAi={vi.fn()}
        onOpenAgent={onOpenAgent}
        onSelectTab={vi.fn()}
        onToast={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /个人收藏食谱/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /AI 食谱推荐/ })).toBeVisible()
    expect(document.querySelectorAll('.recipe-mini')).toHaveLength(5)
    fireEvent.click(screen.getByRole('button', { name: /语音/ }))
    expect(onOpenAgent).toHaveBeenCalledWith('今晚用番茄和鸡蛋能做什么？')
  })

  it('opens recipe and tool callbacks without native writes', () => {
    const onOpenRecipe = vi.fn()
    const onOpenPlanner = vi.fn()
    const onOpenAi = vi.fn()
    const onOpenIllustration = vi.fn()
    render(
      <RecipeScene
        onOpenRecipe={onOpenRecipe}
        onOpenPlanner={onOpenPlanner}
        onOpenAi={onOpenAi}
        onOpenIllustration={onOpenIllustration}
        onOpenAgent={vi.fn()}
        onSelectTab={vi.fn()}
        onToast={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /番茄鸡蛋轻食碗/ }))
    expect(onOpenRecipe).toHaveBeenCalledWith(RECIPES[0])
    fireEvent.click(screen.getByRole('button', { name: /周规划/ }))
    fireEvent.click(screen.getByRole('button', { name: /AI 食谱推荐/ }))
    fireEvent.click(screen.getByRole('button', { name: /菜谱插画/ }))
    expect(onOpenPlanner).toHaveBeenCalledOnce()
    expect(onOpenAi).toHaveBeenCalledOnce()
    expect(onOpenIllustration).toHaveBeenCalledOnce()
    expect((window as unknown as { NativeBridge?: unknown }).NativeBridge).toBeUndefined()
  })
})

describe('RecipeDetailModal', () => {
  it('shows the accepted pot transition then deterministic steps', () => {
    vi.useFakeTimers()
    render(<RecipeDetailModal recipe={RECIPES[0]} />)
    expect(screen.getByText('锅正在咕嘟咕嘟生成步骤…')).toBeVisible()
    act(() => vi.advanceTimersByTime(950))
    expect(screen.getByText('15 分钟')).toBeVisible()
    expect(screen.getByText('320 kcal')).toBeVisible()
    expect(document.querySelectorAll('.recipe-step')).toHaveLength(4)
    vi.useRealTimers()
  })
})

describe('MealPlannerModal', () => {
  function PlannerHarness() {
    const [state, dispatch] = useReducer(appReducer, {
      scene: 'app' as const,
      currentTab: 'recipe' as const,
      modal: null,
      toast: null,
      muted: false,
      reducedMotion: false,
      displayMode: 'sleep' as const,
      noteText: '',
      visibleNoteText: '',
      planner: emptyPlanner(),
    })
    return (
      <MealPlannerModal
        planner={state.planner}
        missingIngredients={[]}
        onAssign={(day, recipe) =>
          dispatch({ type: 'assign-recipe', day, recipeId: recipe.id })
        }
        onClear={(day) => dispatch({ type: 'clear-recipe', day })}
      />
    )
  }

  it('renders seven days and supports select, replace, and clear', () => {
    render(<PlannerHarness />)
    expect(document.querySelectorAll('.planner-day')).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: /周一/ }))
    fireEvent.click(screen.getByRole('button', { name: /三文鱼谷物碗/ }))
    expect(screen.getByRole('button', { name: /周一.*三文鱼谷/ })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /周一.*三文鱼谷/ }))
    fireEvent.click(screen.getByRole('button', { name: /番茄鸡蛋轻食碗/ }))
    fireEvent.click(screen.getByRole('button', { name: /周一.*番茄鸡蛋/ }))
    fireEvent.click(screen.getByRole('button', { name: '✕ 清空这一天' }))
    expect(screen.getByRole('button', { name: /周一.*TAP/ })).toBeVisible()
  })
})
