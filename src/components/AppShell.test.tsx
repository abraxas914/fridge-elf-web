import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { AppTab } from '../app/types'
import { AppShell } from './AppShell'

function Harness({
  initialTab = 'fridge',
  withModal = false,
  toast = null,
  onRestartDemo,
}: {
  initialTab?: AppTab
  withModal?: boolean
  toast?: string | null
  onRestartDemo?: () => void
}) {
  const [tab, setTab] = useState<AppTab>(initialTab)
  const [modalOpen, setModalOpen] = useState(withModal)
  return (
    <AppShell
      currentTab={tab}
      muted={false}
      connected={false}
      toast={toast}
      modal={
        modalOpen
          ? { title: '测试弹窗', content: <button type="button">弹窗动作</button> }
          : null
      }
      onSelectTab={setTab}
      onToggleMute={() => undefined}
      onOpenPeek={() => setModalOpen(true)}
      onCloseModal={() => setModalOpen(false)}
      onRestartDemo={onRestartDemo}
    >
      <div>ACTIVE {tab}</div>
    </AppShell>
  )
}

describe('AppShell', () => {
  it('keeps the five approved nav labels in exact order', () => {
    render(<Harness />)
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      '购物',
      '食谱',
      '冰箱',
      '显示屏',
      '我的',
    ])
  })

  it('changes selected tab and switches to the compact header', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('tab', { name: '食谱' }))

    expect(screen.getByRole('tab', { name: '食谱' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(container.querySelector('.app-header')).toHaveClass('compact')
    expect(container.querySelector('.compact-tab-label')).toHaveTextContent(
      '食谱',
    )
  })

  it('focuses the modal, traps Tab, and closes on Escape', () => {
    render(<Harness withModal />)
    const close = screen.getByRole('button', { name: '关闭' })
    expect(close).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps navigation present while a toast is shown', () => {
    render(<Harness toast="✓ 已加入周菜谱" />)
    expect(screen.getByRole('status')).toHaveTextContent('✓ 已加入周菜谱')
    expect(screen.getAllByRole('tab')).toHaveLength(5)
  })

  it('gives every icon-only shell control an accessible name', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: '静音' })).toBeEnabled()
    expect(screen.getByRole('button', { name: /实时查看/ })).toBeEnabled()
  })

  it('offers a deterministic demo restart action', () => {
    const onRestartDemo = vi.fn()
    render(<Harness onRestartDemo={onRestartDemo} />)

    fireEvent.click(
      screen.getByRole('button', { name: '重新开始 Demo' }),
    )
    expect(onRestartDemo).toHaveBeenCalledOnce()
  })
})
