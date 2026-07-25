import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { useReducer } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { RecipeIllustrationPort } from '../../app/ports'
import { appReducer, emptyPlanner } from '../../app/state'
import { RECIPES } from '../../fixtures/goldenFixture'
import { MealPlannerModal } from './MealPlannerModal'
import { RecipeDetailModal } from './RecipeDetailModal'
import { RecipeScene } from './RecipeScene'

describe('RecipeScene', () => {
  it('ports the manual Agent composer and managed recommendation tool', async () => {
    const onOpenAgent = vi.fn(async () => undefined)
    const onOpenAi = vi.fn()
    const onOpenIllustration = vi.fn()
    render(
      <RecipeScene
        onOpenRecipe={vi.fn()}
        onOpenPlanner={vi.fn()}
        onOpenAi={onOpenAi}
        onOpenIllustration={onOpenIllustration}
        onOpenAgent={onOpenAgent}
        onSelectTab={vi.fn()}
        onToast={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /个人收藏食谱/ })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /今日推荐/ }))
    expect(onOpenAi).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: /周规划/ })).toBeVisible()
    fireEvent.click(
      screen.getByRole('button', { name: /AI 食谱插画/ }),
    )
    expect(onOpenIllustration).toHaveBeenCalledOnce()
    expect(
      screen.getAllByRole('button', {
        name: /个人收藏食谱|今日推荐|周规划|AI 食谱插画/,
      }),
    ).toHaveLength(4)
    fireEvent.change(screen.getByRole('textbox', { name: '向冰箱提问' }), {
      target: { value: '今晚用番茄和鸡蛋能做什么？' },
    })
    fireEvent.click(screen.getByRole('button', { name: '询问' }))
    await waitFor(() =>
      expect(onOpenAgent).toHaveBeenCalledWith(
        '今晚用番茄和鸡蛋能做什么？',
      ),
    )
  })

  it('opens favorites and planner callbacks without native writes', () => {
    const onOpenFavorites = vi.fn()
    const onOpenPlanner = vi.fn()
    render(
      <RecipeScene
        onOpenPlanner={onOpenPlanner}
        onOpenFavorites={onOpenFavorites}
        onOpenAgent={vi.fn(async () => undefined)}
        onToast={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /个人收藏食谱/ }))
    fireEvent.click(screen.getByRole('button', { name: /周规划/ }))
    expect(onOpenFavorites).toHaveBeenCalledOnce()
    expect(onOpenPlanner).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: /今日推荐/ }))
      .not.toBeInTheDocument()
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
    expect(screen.getByText('番茄洗净后切成小块。')).toBeVisible()
    expect(document.querySelectorAll('.recipe-step')).toHaveLength(3)
    vi.useRealTimers()
  })

  it('shows structured ingredient amounts and hides unknown time', () => {
    vi.useFakeTimers()
    const recipe = RECIPES.find(
      (candidate) => candidate.id === 'recipe-bamboo-chicken-rice',
    )!
    render(<RecipeDetailModal recipe={recipe} />)
    act(() => vi.advanceTimersByTime(950))

    expect(screen.getByText('鸡丁 · 170g')).toBeVisible()
    expect(screen.queryByText('0 分钟')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('turns the displayed recipe into the shared illustration contract', async () => {
    vi.useFakeTimers()
    const illustration: RecipeIllustrationPort = {
      start: vi.fn(async () => ({
        id: 'job-1',
        status: 'succeeded' as const,
        completedPages: 1,
        totalPages: 1,
        pages: [
          {
            index: 1,
            imageUrl:
              'https://appassets.androidplatform.net/generated/job-1/1.png',
          },
        ],
      })),
      getJob: vi.fn(),
      remove: vi.fn(),
    }

    render(
      <RecipeDetailModal
        recipe={RECIPES[0]}
        illustration={illustration}
        managed
      />,
    )
    await act(async () => {
      vi.advanceTimersByTime(950)
      await Promise.resolve()
    })

    expect(screen.getAllByRole('radio')).toHaveLength(4)
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: '生成食谱插画' }),
      )
      await Promise.resolve()
    })

    expect(illustration.start).toHaveBeenCalledWith({
      contractVersion: 1,
      recipe: expect.objectContaining({
        id: 'recipe-tomato-egg-bowl',
        title: '番茄鸡蛋轻食碗',
        ingredients: [
          { name: '番茄' },
          { name: '鸡蛋' },
        ],
        steps: expect.arrayContaining([
          expect.objectContaining({ order: 1 }),
          expect.objectContaining({ order: 3 }),
        ]),
      }),
      styleId: 'xiaohei',
    })
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
        onAssign={(day, meal, recipe) =>
          dispatch({
            type: 'assign-recipe',
            day,
            meal,
            recipeId: recipe.id,
          })
        }
        onClear={(day, meal) =>
          dispatch({ type: 'clear-recipe', day, meal })
        }
      />
    )
  }

  it('renders seven days and supports select, replace, and clear', () => {
    render(<PlannerHarness />)
    expect(document.querySelectorAll('.planner-day')).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: /周一/ }))
    fireEvent.click(screen.getByRole('button', { name: /晚餐/ }))
    fireEvent.click(screen.getByRole('button', { name: /选择三文鱼谷物碗/ }))
    fireEvent.click(screen.getByRole('button', { name: '加入这餐' }))
    expect(
      screen.getByRole('button', { name: /晚餐.*三文鱼谷物碗/ }),
    ).toBeVisible()
    fireEvent.click(
      screen.getByRole('button', { name: /晚餐.*三文鱼谷物碗/ }),
    )
    fireEvent.click(screen.getByRole('button', { name: /选择番茄鸡蛋轻食碗/ }))
    fireEvent.click(screen.getByRole('button', { name: '加入这餐' }))
    fireEvent.click(
      screen.getByRole('button', { name: /晚餐.*番茄鸡蛋/ }),
    )
    fireEvent.click(screen.getByRole('button', { name: '清空这顿' }))
    expect(
      screen.getByRole('button', { name: /晚餐.*点击选择菜品/ }),
    ).toBeVisible()
  })

  it('does not assign a candidate before explicit confirmation', () => {
    const onAssign = vi.fn()
    render(
      <MealPlannerModal
        planner={emptyPlanner()}
        missingIngredients={[]}
        onAssign={onAssign}
        onClear={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /周一/ }))
    fireEvent.click(screen.getByRole('button', { name: /晚餐/ }))
    fireEvent.click(screen.getByRole('button', { name: /选择番茄鸡蛋轻食碗/ }))
    expect(onAssign).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '加入这餐' }))
    expect(onAssign).toHaveBeenCalledWith(
      'mon',
      'dinner',
      expect.objectContaining({ id: 'recipe-tomato-egg-bowl' }),
    )
  })
})
