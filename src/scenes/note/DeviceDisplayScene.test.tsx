import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeviceDisplayScene } from './DeviceDisplayScene'

describe('DeviceDisplayScene', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('ports sleep, awake, and the exact 15-second auto-sleep transition', () => {
    vi.useFakeTimers()
    const cue = vi.fn()
    render(
      <DeviceDisplayScene
        reducedMotion={false}
        onToast={vi.fn()}
        onCue={cue}
      />,
    )

    expect(screen.getByTestId('device-screen')).toHaveClass('sleep')
    fireEvent.click(screen.getByRole('button', { name: '◐ 唤醒' }))
    expect(screen.getByTestId('device-screen')).toHaveClass('awake')
    expect(screen.getByTestId('display-mode-badge')).toHaveTextContent(
      '● 唤醒 · AWAKE',
    )
    expect(cue).toHaveBeenCalledWith('wake')

    act(() => vi.advanceTimersByTime(14_999))
    expect(screen.getByTestId('device-screen')).toHaveClass('awake')
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByTestId('device-screen')).toHaveClass('sleep')
    expect(screen.getByTestId('display-mode-badge')).toHaveTextContent(
      '◐ 休眠 · E-INK',
    )
  })

  it('ports voice listening and the 3.2-second simulated reply', () => {
    vi.useFakeTimers()
    render(
      <DeviceDisplayScene reducedMotion={false} onToast={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /语音互动/ }))
    expect(screen.getByTestId('device-screen')).toHaveClass('voice')
    expect(screen.getByText('◉ LISTENING…')).toBeVisible()

    act(() => vi.advanceTimersByTime(3_200))
    expect(screen.getByTestId('device-screen')).toHaveClass('awake')
    expect(screen.getByText('好的！')).toBeVisible()
    expect(screen.getByText('✨ 已打开冰箱 ✨')).toBeVisible()
  })

  it('ports meals, calendar, and weather widgets with a fixed clock', () => {
    const fixed = new Date('2026-07-24T12:00:00+08:00')
    render(
      <DeviceDisplayScene
        reducedMotion={false}
        onToast={vi.fn()}
        now={() => fixed}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /三餐/ }))
    expect(screen.getByTestId('display-widget-meals')).toHaveTextContent(
      '番茄鸡蛋碗 · 320K',
    )
    fireEvent.click(screen.getByRole('button', { name: /日历/ }))
    expect(screen.getByTestId('display-widget-calendar')).toHaveTextContent(
      '2026.07',
    )
    expect(screen.getByTestId('display-widget-calendar')).toHaveTextContent(
      '12:00',
    )
    fireEvent.click(screen.getByRole('button', { name: /天气/ }))
    expect(screen.getByTestId('display-widget-weather')).toHaveTextContent(
      '26°C 晴',
    )
  })

  it('ports quick notes, validation, pulse, toast, and 55ms typewriter', () => {
    vi.useFakeTimers()
    const toast = vi.fn()
    render(
      <DeviceDisplayScene reducedMotion={false} onToast={toast} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '发送 ▶' }))
    expect(toast).toHaveBeenLastCalledWith('先写点什么吧 ~')

    fireEvent.click(screen.getByRole('button', { name: /早点回家/ }))
    expect(screen.getByLabelText('发送便签')).toHaveValue('早点回家')
    fireEvent.click(screen.getByRole('button', { name: '发送 ▶' }))
    expect(screen.getByTestId('device-screen')).toHaveClass('pulse')
    expect(screen.getByTestId('display-mode-badge')).toHaveTextContent(
      'NOTE · LIVE',
    )

    act(() => vi.advanceTimersByTime(55 * 4))
    expect(screen.getByTestId('display-note')).toHaveTextContent('早点回家')
    act(() => vi.advanceTimersByTime(400 - 55 * 4))
    expect(toast).toHaveBeenLastCalledWith('✓ 已推送到冰箱屏')
    act(() => vi.advanceTimersByTime(200))
    expect(screen.getByTestId('device-screen')).not.toHaveClass('pulse')
  })

  it('reveals a note immediately under reduced motion', () => {
    render(
      <DeviceDisplayScene reducedMotion onToast={vi.fn()} />,
    )

    fireEvent.change(screen.getByLabelText('发送便签'), {
      target: { value: '记得喝牛奶' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送 ▶' }))
    expect(screen.getByTestId('display-note')).toHaveTextContent('记得喝牛奶')
  })
})
