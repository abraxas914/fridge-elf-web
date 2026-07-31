import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DemoAgentInput, DemoAgentResponse } from './ai/types'
import type { NativeEvent } from './bridge/types'
import { createDemoRuntime } from './demo/demoRuntime'
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
    expect(screen.getByRole('button', { name: '番茄，4个' })).toBeVisible()
    expect(screen.getByRole('button', { name: '牛奶，1L' })).toBeVisible()
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
    fireEvent.click(screen.getByRole('button', { name: /晚餐/ }))
    fireEvent.click(
      screen.getAllByRole('button', { name: /三文鱼谷物碗/ }).at(-1)!,
    )
    fireEvent.click(screen.getByRole('button', { name: '加入这餐' }))
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    fireEvent.click(screen.getByRole('tab', { name: '购物' }))

    expect(screen.getByText('• 谷物饭')).toBeVisible()
  })

  it('opens the AI recipe illustration studio from the fourth tool', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '跳过' }))
    fireEvent.click(screen.getByRole('tab', { name: '食谱' }))

    fireEvent.click(
      screen.getByRole('button', { name: /AI 食谱插画/ }),
    )

    expect(screen.getByRole('dialog')).toHaveTextContent(
      'AI 食谱插画 · IMAGE2',
    )
    expect(
      screen.getByRole('button', { name: '选择食谱' }),
    ).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '粘贴食谱' }))
    expect(
      screen.getByRole('textbox', { name: '粘贴食谱正文' }),
    ).toBeVisible()
  })

  it('sends the current mock world to online recommendation and Agent panels', async () => {
    const requester = vi.fn(
      async (input: DemoAgentInput): Promise<DemoAgentResponse> => ({
        answer:
          input.mode === 'recommend'
            ? '在线推荐：先吃今天临期的番茄。'
            : '在线回答：番茄和鸡蛋可以直接使用。',
      }),
    )
    render(
      <App
        inventoryRuntime={createDemoRuntime({
          agentRequester: requester,
        })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '跳过' }))
    fireEvent.click(screen.getByRole('tab', { name: '食谱' }))
    fireEvent.click(screen.getByRole('button', { name: /今日推荐/ }))
    expect(
      await screen.findByText('在线推荐：先吃今天临期的番茄。'),
    ).toBeVisible()
    expect(requester).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'recommend',
        snapshot: expect.objectContaining({
          inventory: expect.arrayContaining([
            expect.objectContaining({
              name: '番茄',
              expiryLevel: 'urgent',
            }),
          ]),
        }),
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    fireEvent.change(screen.getByRole('textbox', { name: '向冰箱提问' }), {
      target: { value: '今晚用番茄和鸡蛋能做什么？' },
    })
    fireEvent.click(screen.getByRole('button', { name: '询问' }))
    expect(
      await screen.findByText('在线回答：番茄和鸡蛋可以直接使用。'),
    ).toBeVisible()
    expect(requester).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: 'agent',
        message: '今晚用番茄和鸡蛋能做什么？',
      }),
    )
  })

  it('preserves local preview state while switching between all five tabs', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '跳过' }))
    fireEvent.click(screen.getByRole('tab', { name: '购物' }))
    const milk = screen.getByRole('button', { name: '完成 牛奶' })
    fireEvent.click(milk)
    expect(milk).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('tab', { name: '显示屏' }))
    fireEvent.click(screen.getByRole('tab', { name: '购物' }))
    expect(screen.getByRole('button', { name: '恢复 牛奶' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('offers a browser-only restart action for resetting the Demo world', () => {
    const onRestartDemo = vi.fn()
    render(<App onRestartDemo={onRestartDemo} />)
    fireEvent.click(screen.getByRole('button', { name: '跳过' }))

    fireEvent.click(screen.getByRole('button', { name: '重新开始 Demo' }))

    expect(onRestartDemo).toHaveBeenCalledOnce()
  })

  it('lets Android Back close a modal then restore the previous tab', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '跳过' }))
    fireEvent.click(screen.getByRole('tab', { name: '食谱' }))
    fireEvent.click(screen.getByRole('button', { name: /今日推荐/ }))
    await screen.findByRole('dialog')

    const hostWindow = window as Window & {
      handleAndroidBack?: () => boolean
    }
    act(() => {
      expect(hostWindow.handleAndroidBack?.()).toBe(true)
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: '食谱' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    )
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
      ...createDemoRuntime(),
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
        removeItem: vi.fn(),
        updateItemQuantity: vi.fn(),
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
