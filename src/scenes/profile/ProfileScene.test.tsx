import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProfileScene } from './ProfileScene'
import { createMemoryStorage } from '../../demo/memoryStorage'

describe('ProfileScene', () => {
  it('persists preferences into the injected demo store', () => {
    const storage = createMemoryStorage()
    render(<ProfileScene storage={storage} />)

    fireEvent.click(screen.getByRole('button', { name: /增肌/ }))

    expect(
      JSON.parse(storage.getItem('fridge-profile-v1') ?? '{}'),
    ).toMatchObject({ fitness: 'gain' })
  })

  it('keeps product preferences without exposing BYOK configuration', () => {
    render(<ProfileScene storage={createMemoryStorage()} />)

    expect(screen.getByText('居住模式')).toBeVisible()
    expect(screen.getByText('口味偏好')).toBeVisible()
    expect(screen.getByText('病史 / 过敏源 / 忌口')).toBeVisible()
    expect(screen.queryByText('密钥配置')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/智能助手与食谱插画/),
    ).not.toBeInTheDocument()
  })

  it('ports the exact default living mode and resident choices', () => {
    render(<ProfileScene />)

    expect(screen.getByText('HI, 冰箱主人')).toBeVisible()
    expect(screen.getByRole('button', { name: /独居/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('猫咪')).toBeVisible()
    expect(screen.queryByText('妈妈')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /家庭/ }))
    expect(screen.getByText('妈妈')).toBeVisible()
    expect(screen.queryByText('猫咪')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /合租/ }))
    expect(screen.getByText('室友 A')).toBeVisible()
  })

  it('persists taste, fitness, routine, and the health field', () => {
    render(<ProfileScene />)

    fireEvent.click(screen.getByRole('button', { name: /清淡/ }))
    expect(screen.getByRole('button', { name: /清淡/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: /增肌/ }))
    fireEvent.click(screen.getByRole('button', { name: /快手/ }))

    const health = screen.getByLabelText('健康与忌口说明')
    expect(health).toHaveAttribute('maxlength', '120')
    fireEvent.change(health, { target: { value: '乳糖不耐、少盐' } })
    expect(health).toHaveValue('乳糖不耐、少盐')
    expect(JSON.parse(localStorage.getItem('fridge-profile-v1') ?? '{}'))
      .toMatchObject({
        taste: 'clean',
        fitness: 'gain',
        routine: 'quick',
      })
  })

  it('ports the four settings and their exact default states', () => {
    render(<ProfileScene />)

    expect(screen.getByRole('switch', { name: '临期提醒' })).toBeChecked()
    expect(screen.getByRole('switch', { name: '摄像头识别' })).toBeChecked()
    expect(screen.getByRole('switch', { name: '夜间省电' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Agent Chat Bot' })).toBeChecked()

    fireEvent.click(screen.getByRole('switch', { name: '夜间省电' }))
    expect(screen.getByRole('switch', { name: '夜间省电' })).toBeChecked()

    fireEvent.click(screen.getByRole('switch', { name: '临期提醒' }))
    expect(screen.getByRole('switch', { name: '临期提醒' })).not.toBeChecked()
  })
})
