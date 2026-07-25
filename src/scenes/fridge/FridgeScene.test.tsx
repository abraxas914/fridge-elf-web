import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mapNativeInventoryItem } from '../../app/inventoryMapper'
import type { PresentedFood } from '../../app/types'
import { FoodDetailModal } from './FoodDetailModal'
import { FridgePreviewModal } from './FridgePreviewModal'
import { FridgeScene } from './FridgeScene'
import { GOLDEN_PRESENTED_FOODS } from './foodPresentation'

describe('FridgeScene', () => {
  it('ports the prototype storage, stats, and three-column inventory', () => {
    render(
      <FridgeScene items={GOLDEN_PRESENTED_FOODS} onOpenFood={vi.fn()} />,
    )

    expect(screen.getAllByTestId('storage-segment')).toHaveLength(12)
    expect(screen.getByText('FILLING · 空间紧张')).toBeVisible()
    expect(screen.getByText('BOX · 还有 6 个位置 · 空间紧张')).toBeVisible()
    expect(screen.getByText('总食材').previousSibling).toHaveTextContent('18')
    expect(screen.getByText('将过期').previousSibling).toHaveTextContent('3')
    expect(screen.getByText('紧急').previousSibling).toHaveTextContent('2')
    expect(document.querySelectorAll('.food-item')).toHaveLength(18)
  })

  it('filters the same catalog categories as the prototype', () => {
    render(
      <FridgeScene items={GOLDEN_PRESENTED_FOODS} onOpenFood={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '饮品' }))

    expect(screen.getByRole('button', { name: '牛奶，1L' })).toBeVisible()
    expect(document.querySelectorAll('.food-item')).toHaveLength(1)
  })

  it('renders critical timing, badge, and mold overlay', () => {
    render(
      <FridgeScene items={GOLDEN_PRESENTED_FOODS} onOpenFood={vi.fn()} />,
    )

    const tomato = screen.getByRole('button', { name: '番茄，4个' })
    expect(tomato).toHaveClass('moldy')
    expect(within(tomato).getByText('!')).toBeVisible()
    expect(within(tomato).getByText('D-1')).toHaveClass('bad')
    expect(tomato.querySelector('.mold-overlay')).toBeInTheDocument()
  })

  it('opens the selected prototype food through the provided callback', () => {
    const onOpenFood = vi.fn()
    render(
      <FridgeScene
        items={GOLDEN_PRESENTED_FOODS}
        onOpenFood={onOpenFood}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '番茄，4个' }))

    expect(onOpenFood).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'tomato', quantity: '4个' }),
    )
  })

  it('keeps known native quantity and expiry date with catalog art', () => {
    const nativeFood = mapNativeInventoryItem(
      {
        id: 'native-tomato',
        name: '番茄',
        quantity: '9个',
        storage: 'fridge',
        expiryDate: '2026-07-28',
        status: 'fresh',
      },
      new Date(2026, 6, 24),
    )
    render(<FridgeScene items={[nativeFood]} onOpenFood={vi.fn()} />)

    const card = screen.getByRole('button', { name: '番茄，9个' })
    expect(card).toHaveAttribute('data-expiry-date', '2026-07-28')
    expect(card.querySelector('.food-art')).toHaveAttribute(
      'src',
      expect.stringContaining('%3Csvg'),
    )
  })

  it('uses neutral art and unknown nutrition for uncatalogued native food', () => {
    const nativeFood = mapNativeInventoryItem(
      {
        id: 'native-mystery',
        name: '自制酱料',
        quantity: '1罐',
        storage: 'fridge',
        expiryDate: '2026-07-30',
        status: 'fresh',
      },
      new Date(2026, 6, 24),
    )
    render(<FridgeScene items={[nativeFood]} onOpenFood={vi.fn()} />)

    const card = screen.getByRole('button', { name: '自制酱料，1罐' })
    expect(within(card).getByText('-- KCAL')).toBeVisible()
    expect(card.querySelector('.food-art')).toBeInTheDocument()
  })

  it('updates inventory in place when new items are supplied', () => {
    const { rerender } = render(
      <FridgeScene
        items={GOLDEN_PRESENTED_FOODS.slice(0, 2)}
        onOpenFood={vi.fn()}
      />,
    )
    expect(document.querySelectorAll('.food-item')).toHaveLength(2)

    rerender(
      <FridgeScene
        items={GOLDEN_PRESENTED_FOODS.slice(0, 3)}
        onOpenFood={vi.fn()}
      />,
    )

    expect(document.querySelectorAll('.food-item')).toHaveLength(3)
    expect(screen.getByRole('button', { name: '番茄，4个' })).toBeVisible()
  })
})

describe('fridge modals', () => {
  it('ports the exact food detail rows and critical copy', () => {
    const tomato = GOLDEN_PRESENTED_FOODS.find(
      (food) => food.key === 'tomato',
    ) as PresentedFood
    render(<FoodDetailModal food={tomato} />)

    expect(screen.getByText('4个')).toBeVisible()
    expect(screen.getByText('18 kcal / 100g')).toBeVisible()
    expect(screen.getByText('2 天')).toBeVisible()
    expect(screen.getByText('1 天')).toBeVisible()
    expect(screen.getByText('! 请尽快食用（已长毛！）')).toBeVisible()
    expect(document.querySelector('.food-detail-art .mold-overlay')).toBeInTheDocument()
  })

  it('ports the four-column local preview', () => {
    render(<FridgePreviewModal items={GOLDEN_PRESENTED_FOODS} />)

    expect(
      screen.getByText(/CAM LIVE · 冰箱内摄像头/),
    ).toBeVisible()
    expect(screen.getByText('18 items · 4°C · 2 min ago')).toBeVisible()
    expect(document.querySelectorAll('.peek-cell')).toHaveLength(18)
    expect(document.querySelectorAll('.peek-cell.urgent')).toHaveLength(3)
  })
})
