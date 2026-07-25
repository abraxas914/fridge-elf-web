import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DemoApiError } from '../../ai/demoApi'
import type {
  DemoAgentResponse,
  DemoWorldSnapshot,
} from '../../ai/types'
import { DemoAgentPanel } from './DemoAgentPanel'

const snapshot: DemoWorldSnapshot = {
  inventory: [
    {
      name: '番茄',
      quantity: '4个',
      category: 'ingredient',
      expiryLevel: 'urgent',
    },
  ],
  plannedMeals: [],
  missingItems: [],
  availableRecipes: [
    { id: 'recipe-tomato-egg-bowl', name: '番茄鸡蛋轻食碗' },
  ],
}

describe('DemoAgentPanel', () => {
  it('shows a restrained loading state and renders an online answer', async () => {
    let resolveRequest:
      | ((value: DemoAgentResponse) => void)
      | undefined
    const requester = vi.fn(
      () =>
        new Promise<DemoAgentResponse>((resolve) => {
          resolveRequest = resolve
        }),
    )

    render(
      <DemoAgentPanel
        mode="agent"
        message="今晚吃什么？"
        snapshot={snapshot}
        requester={requester}
        onOpenRecipe={vi.fn()}
      />,
    )

    expect(screen.getByText('正在看看冰箱里有什么……')).toBeInTheDocument()
    resolveRequest?.({
      answer: '优先使用今天临期的番茄。',
      notices: ['番茄今天临期'],
    })
    expect(
      await screen.findByText('优先使用今天临期的番茄。'),
    ).toBeInTheDocument()
    expect(screen.getByText('ONLINE · READ ONLY')).toBeInTheDocument()
  })

  it('opens only recipe IDs present in the submitted snapshot', async () => {
    const onOpenRecipe = vi.fn()
    const requester = vi.fn().mockResolvedValue({
      answer: '给你两项建议。',
      suggestions: [
        {
          title: '番茄鸡蛋轻食碗',
          reason: '食材齐全',
          recipeId: 'recipe-tomato-egg-bowl',
        },
        {
          title: '不存在的菜',
          reason: '不应执行',
          recipeId: 'recipe-unknown',
        },
      ],
    })

    render(
      <DemoAgentPanel
        mode="agent"
        message="推荐菜谱"
        snapshot={snapshot}
        requester={requester}
        onOpenRecipe={onOpenRecipe}
      />,
    )

    fireEvent.click(
      await screen.findByRole('button', { name: /番茄鸡蛋轻食碗/ }),
    )
    expect(onOpenRecipe).toHaveBeenCalledWith('recipe-tomato-egg-bowl')
    expect(
      screen.queryByRole('button', { name: /不存在的菜/ }),
    ).toBeNull()
    expect(screen.getByText('不存在的菜')).toBeInTheDocument()
  })

  it('falls back to a deterministic local answer on gateway failure', async () => {
    render(
      <DemoAgentPanel
        mode="agent"
        message="今晚吃什么？"
        snapshot={snapshot}
        requester={vi
          .fn()
          .mockRejectedValue(new DemoApiError('AGENT_UNAVAILABLE', 502))}
        onOpenRecipe={vi.fn()}
      />,
    )

    expect(
      await screen.findByText(
        '在线建议暂时走神了，先为你展示一份本地推荐。',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/建议先做「番茄鸡蛋轻食碗」/),
    ).toBeInTheDocument()
    expect(screen.getByText('LOCAL PREVIEW · FIXTURE')).toBeInTheDocument()
  })

  it('uses friendly throttling copy while retaining the fixture fallback', async () => {
    render(
      <DemoAgentPanel
        mode="recommend"
        snapshot={snapshot}
        requester={vi
          .fn()
          .mockRejectedValue(new DemoApiError('DEMO_RATE_LIMITED', 429))}
        onOpenRecipe={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByText('今天来访的人有点多，请稍后再问我。'),
      ).toBeInTheDocument()
    })
    expect(screen.getByText(/优先推荐能直接开做的菜谱/)).toBeInTheDocument()
  })
})
