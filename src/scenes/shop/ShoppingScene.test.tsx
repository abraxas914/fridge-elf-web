import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ShoppingScene } from './ShoppingScene'

describe('ShoppingScene', () => {
  it('ports the five fixture rows and remaining count toggle', () => {
    render(<ShoppingScene missingIngredients={[]} onToast={vi.fn()} />)
    expect(screen.getByText('4 项')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '完成 牛奶' }))
    expect(screen.getByText('3 项')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '恢复 牛奶' }))
    expect(screen.getByText('4 项')).toBeVisible()
  })

  it('removes the duplicate summary and supports manual text entry', () => {
    const onToast = vi.fn()
    const { rerender } = render(
      <ShoppingScene missingIngredients={[]} onToast={onToast} />,
    )
    expect(screen.queryByText('◆ 采购清单')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '↻ 生成' })).not.toBeInTheDocument()
    expect(screen.getByText(/还没有规划本周食谱/)).toBeVisible()

    rerender(
      <ShoppingScene missingIngredients={['米/藜麦']} onToast={onToast} />,
    )
    expect(screen.getByText('• 米/藜麦')).toBeVisible()
    fireEvent.change(screen.getByPlaceholderText('例如：五花肉'), {
      target: { value: '豆腐' },
    })
    fireEvent.click(screen.getByRole('button', { name: '手动添加采购项' }))
    expect(screen.getByText('豆腐')).toBeVisible()
  })
})
