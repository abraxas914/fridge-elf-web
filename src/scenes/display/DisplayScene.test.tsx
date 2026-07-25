import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultFavoriteRecipes } from '../../app/recipes'
import { emptyPlanner } from '../../app/state'
import type { DisplayState } from '../../bridge/types'
import { DisplayScene } from './DisplayScene'

afterEach(() => localStorage.clear())

describe('DisplayScene', () => {
  it('sends note, meal, date, and calendar text through its display port', () => {
    const onSendDisplay = vi.fn<(state: DisplayState) => Promise<void>>(
      async () => undefined,
    )

    render(
      <DisplayScene
        items={[]}
        planner={emptyPlanner()}
        recipes={defaultFavoriteRecipes()}
        connected
        onSendDisplay={onSendDisplay}
        onToast={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '便签' }))
    fireEvent.change(screen.getByPlaceholderText('敲一句话给家人 / 给自己'), {
      target: { value: '早点回家' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    fireEvent.click(screen.getByRole('button', { name: '三餐' }))
    const mealInputs = screen.getAllByPlaceholderText('等待规划')
    fireEvent.change(mealInputs[0], { target: { value: '鸡蛋面' } })
    fireEvent.click(screen.getByRole('button', { name: '同步三餐' }))

    fireEvent.click(screen.getByRole('button', { name: '日历' }))
    fireEvent.change(screen.getByPlaceholderText('例如：晚上七点家庭聚餐'), {
      target: { value: '晚上七点家庭聚餐' },
    })
    fireEvent.click(screen.getByRole('button', { name: '同步日历' }))

    const payload = onSendDisplay.mock.calls.at(-1)?.[0]
    expect(payload).toBeDefined()
    expect(payload).toMatchObject({
      mode: 'calendar',
      note: '早点回家',
      meals: ['鸡蛋面', '', ''],
      calendarText: '晚上七点家庭聚餐',
    })
    expect(payload?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
