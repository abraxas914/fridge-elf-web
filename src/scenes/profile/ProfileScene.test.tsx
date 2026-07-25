import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProfileScene } from './ProfileScene'

describe('ProfileScene', () => {
  it('ports the exact default living mode and resident choices', () => {
    const toast = vi.fn()
    const cue = vi.fn()
    render(<ProfileScene onToast={toast} onCue={cue} />)

    expect(screen.getByText('HI, ALICE ♥')).toBeVisible()
    expect(screen.getByRole('button', { name: /独居/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByTestId('pet-panel')).toBeVisible()
    expect(screen.queryByTestId('family-panel')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /家庭/ }))
    expect(screen.getByTestId('family-panel')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /妈妈/ }))
    expect(screen.getByRole('button', { name: /妈妈/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(toast).toHaveBeenLastCalledWith('✓ 已选择：妈妈')

    fireEvent.click(screen.getByRole('button', { name: /合租/ }))
    expect(screen.getByTestId('roomie-panel')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /室友 A/ }))
    expect(toast).toHaveBeenLastCalledWith('✓ 已选择：室友 A')
    expect(cue).toHaveBeenCalledWith('tick')
  })

  it('ports taste, fitness, routine, and the 80-character health field', () => {
    const toast = vi.fn()
    render(<ProfileScene onToast={toast} />)

    fireEvent.click(screen.getByRole('button', { name: /清淡/ }))
    expect(toast).toHaveBeenLastCalledWith('✓ 已切换：清淡')
    fireEvent.click(screen.getByRole('button', { name: /增肌/ }))
    expect(toast).toHaveBeenLastCalledWith('✓ 已切换：增肌')
    fireEvent.click(screen.getByRole('button', { name: /快手/ }))
    expect(toast).toHaveBeenLastCalledWith('✓ 已切换：快手')

    const health = screen.getByLabelText('健康与忌口说明')
    expect(health).toHaveAttribute('maxlength', '80')
    fireEvent.change(health, { target: { value: '乳糖不耐、少盐' } })
    expect(health).toHaveValue('乳糖不耐、少盐')
  })

  it('ports the four settings and their exact default states', () => {
    const toast = vi.fn()
    const cue = vi.fn()
    render(<ProfileScene onToast={toast} onCue={cue} />)

    expect(screen.getByRole('switch', { name: '临期提醒' })).toBeChecked()
    expect(screen.getByRole('switch', { name: '摄像头识别' })).toBeChecked()
    expect(screen.getByRole('switch', { name: '夜间省电' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Agent Chat Bot' })).toBeChecked()

    fireEvent.click(screen.getByRole('switch', { name: '夜间省电' }))
    expect(screen.getByRole('switch', { name: '夜间省电' })).toBeChecked()
    expect(toast).toHaveBeenLastCalledWith('✓ 已开启')
    expect(cue).toHaveBeenLastCalledWith('success')

    fireEvent.click(screen.getByRole('switch', { name: '临期提醒' }))
    expect(screen.getByRole('switch', { name: '临期提醒' })).not.toBeChecked()
    expect(toast).toHaveBeenLastCalledWith('✕ 已关闭')
    expect(cue).toHaveBeenLastCalledWith('tick')
  })
})
