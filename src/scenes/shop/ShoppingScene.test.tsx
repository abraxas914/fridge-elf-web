import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ShoppingScene } from './ShoppingScene'

describe('ShoppingScene', () => {
  it('ports the five fixture rows and remaining count toggle', () => {
    render(<ShoppingScene missingIngredients={[]} onToast={vi.fn()} />)
    expect(screen.getByText('4 项')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /牛奶/ }))
    expect(screen.getByText('3 项')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /牛奶/ }))
    expect(screen.getByText('4 项')).toBeVisible()
  })

  it('uses the exact regenerate toast and planner-derived copy', () => {
    const onToast = vi.fn()
    const { rerender } = render(
      <ShoppingScene missingIngredients={[]} onToast={onToast} />,
    )
    fireEvent.click(screen.getByRole('button', { name: '↻ 生成' }))
    expect(onToast).toHaveBeenCalledWith('SCAN · 已从冰箱缺货扫描重新生成')
    expect(screen.getByText(/还没有规划本周菜谱/)).toBeVisible()

    rerender(
      <ShoppingScene missingIngredients={['米/藜麦']} onToast={onToast} />,
    )
    expect(screen.getByText('• 米/藜麦')).toBeVisible()
  })
})
