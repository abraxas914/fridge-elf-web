import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { NativeEvent } from './bridge/types'
import { App, type AppInventoryRuntime } from './App'

describe('App', () => {
  it('renders the browser-safe kitchen entry shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '冰箱生活助手' })).toBeVisible()
    expect(screen.getByTestId('kitchen-scene')).toBeVisible()
    expect(screen.getByRole('button', { name: '跳过' })).toBeEnabled()
  })

  it('enters immediately from Skip and selects the fridge tab', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '跳过' }))

    expect(screen.queryByTestId('kitchen-scene')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '冰箱' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getAllByTestId('storage-segment')).toHaveLength(12)
  })

  it('opens the prototype food detail and fridge preview dialogs', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '跳过' }))

    fireEvent.click(screen.getByRole('button', { name: '番茄，4个' }))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      '番茄 · Tomato',
    )
    expect(screen.getByRole('dialog')).toHaveTextContent(
      '! 请尽快食用（已长毛！）',
    )
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))

    fireEvent.click(screen.getByRole('button', { name: /实时查看/ }))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'PEEK · 冰箱一览',
    )
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'CAM LIVE · 冰箱内摄像头',
    )
  })

  it('uses the accepted fridge zoom transition before entering', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '点击冰箱进入' }))
    expect(screen.getByTestId('kitchen-scene')).toHaveClass('kitchen-zooming')
    act(() => vi.advanceTimersByTime(800))
    expect(screen.getByRole('tab', { name: '冰箱' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    vi.useRealTimers()
  })

  it('connects the prototype planner to the derived shopping section', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '跳过' }))
    fireEvent.click(screen.getByRole('tab', { name: '食谱' }))
    fireEvent.click(screen.getByRole('button', { name: /周规划/ }))
    fireEvent.click(screen.getByRole('button', { name: /周一/ }))
    fireEvent.click(
      screen.getAllByRole('button', { name: /三文鱼谷物碗/ }).at(-1)!,
    )
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    fireEvent.click(screen.getByRole('tab', { name: '购物' }))

    expect(screen.getByText('• 米/藜麦')).toBeVisible()
  })

  it('renders deterministic AI and recipe-agent fixture replies', () => {
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '跳过' }))
    fireEvent.click(screen.getByRole('tab', { name: '食谱' }))
    fireEvent.click(screen.getByRole('button', { name: /AI 食谱推荐/ }))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      '已识别：番茄、鸡蛋、香蕉、白菜',
    )
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    fireEvent.click(screen.getByRole('button', { name: /语音/ }))
    act(() => vi.advanceTimersByTime(450))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      '建议先做「番茄鸡蛋轻食碗」',
    )
    vi.useRealTimers()
  })

  it('preserves local preview state while switching between all five tabs', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '跳过' }))
    fireEvent.click(screen.getByRole('tab', { name: '购物' }))
    const milk = screen.getByRole('button', { name: /牛奶.*2L/ })
    fireEvent.click(milk)
    expect(milk).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('tab', { name: '显示屏' }))
    fireEvent.click(screen.getByRole('tab', { name: '购物' }))
    expect(screen.getByRole('button', { name: /牛奶.*2L/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('lets Android Back close a modal then restore the previous tab', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '跳过' }))
    fireEvent.click(screen.getByRole('tab', { name: '食谱' }))
    fireEvent.click(screen.getByRole('button', { name: /AI 食谱推荐/ }))

    const hostWindow = window as Window & {
      handleAndroidBack?: () => boolean
    }
    act(() => {
      expect(hostWindow.handleAndroidBack?.()).toBe(true)
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    act(() => {
      expect(hostWindow.handleAndroidBack?.()).toBe(true)
    })
    expect(screen.getByRole('tab', { name: '冰箱' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    act(() => {
      expect(hostWindow.handleAndroidBack?.()).toBe(false)
    })
  })

  it('renders real NativeBridge inventory and reacts to native status events', async () => {
    let listener: ((event: NativeEvent) => void) | undefined
    const runtime: AppInventoryRuntime = {
      mode: 'native',
      inventory: {
        getItems: async () => [
          {
            id: 'native-milk',
            name: '牛奶',
            quantity: '750ml',
            storage: '冷藏室',
            expiryDate: '2026-07-30',
            status: '已同步',
          },
        ],
        addItem: vi.fn(),
        getMqttStatus: async () => ({
          connected: false,
          detail: '等待设备',
        }),
        subscribe: (nextListener) => {
          listener = nextListener
          return () => {
            listener = undefined
          }
        },
      },
    }
    render(<App inventoryRuntime={runtime} />)
    fireEvent.click(screen.getByRole('button', { name: '跳过' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '牛奶，750ml' })).toBeVisible(),
    )
    expect(screen.getByText('OFFLINE')).toBeVisible()
    act(() => {
      listener?.({
        type: 'mqtt-status',
        payload: { connected: true, detail: '设备在线' },
      })
    })
    expect(screen.getByText('ONLINE')).toBeVisible()
    expect(screen.queryByText('BROWSER MOCK')).not.toBeInTheDocument()
  })
})
