import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mapNativeInventoryItem } from '../../app/inventoryMapper'
import type { PresentedFood } from '../../app/types'
import { FoodDetailModal } from './FoodDetailModal'
import { FridgePreviewModal } from './FridgePreviewModal'
import { FridgeScene } from './FridgeScene'
import { GOLDEN_PRESENTED_FOODS } from './foodPresentation'

describe('FridgeScene', () => {
  it('derives batch and freshness stats without a fixed capacity', () => {
    render(
      <FridgeScene items={GOLDEN_PRESENTED_FOODS} onOpenFood={vi.fn()} />,
    )

    expect(screen.getByLabelText('库存新鲜度分布')).toBeVisible()
    expect(screen.getByText('LIVE · 实时库存')).toBeVisible()
    expect(screen.getByText(/18 个录入批次 · 无虚构容量上限/)).toBeVisible()
    expect(screen.getByText('总食材').previousSibling).toHaveTextContent('18')
    expect(screen.getByText('将过期').previousSibling).toHaveTextContent('5')
    expect(screen.getByText('紧急').previousSibling).toHaveTextContent('3')
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

  it('filters inventory by freshness summary and combines it with category', () => {
    render(
      <FridgeScene items={GOLDEN_PRESENTED_FOODS} onOpenFood={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /将过期/ }))
    expect(document.querySelectorAll('.food-item')).toHaveLength(5)

    fireEvent.click(screen.getByRole('button', { name: '食材' }))
    expect(document.querySelectorAll('.food-item')).toHaveLength(5)

    fireEvent.click(screen.getByRole('button', { name: /紧急/ }))
    expect(document.querySelectorAll('.food-item')).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: /总食材/ }))
    expect(document.querySelectorAll('.food-item')).toHaveLength(14)
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

  it('offers the same manual and hold-to-talk entry actions', async () => {
    const onToast = vi.fn()
    const stop = vi.fn()
    render(
      <FridgeScene
        items={[]}
        onOpenFood={vi.fn()}
        onAddFood={vi.fn()}
        onVoiceStart={() => ({ stop, result: Promise.resolve(2) })}
        onToast={onToast}
      />,
    )

    expect(screen.getByRole('button', { name: /手动添加/ })).toHaveClass(
      'entry-action',
    )
    const voice = screen.getByRole('button', { name: /按住说话/ })
    Object.defineProperty(voice, 'setPointerCapture', { value: vi.fn() })
    expect(voice).toHaveClass('entry-action', 'voice')
    fireEvent.pointerDown(voice, { pointerId: 1 })
    fireEvent.pointerUp(voice, { pointerId: 1 })
    expect(stop).toHaveBeenCalledOnce()
    await waitFor(() => expect(onToast).toHaveBeenCalledWith('语音添加 2 项食物'))
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
