import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CredentialPort } from '../../app/ports'
import type { CredentialSummaries } from '../../features/credentials/types'
import { ProfileScene } from './ProfileScene'
import { createMemoryStorage } from '../../demo/memoryStorage'

function credentials(): CredentialPort {
  return {
    getSummaries: vi.fn(async (): Promise<CredentialSummaries> => ({
      assistant: {
        capability: 'assistant',
        status: 'not_configured',
        providerId: '',
        providerLabel: '',
        modelId: '',
      },
      'recipe-illustration': {
        capability: 'recipe-illustration',
        status: 'not_configured',
        providerId: '',
        providerLabel: '',
        modelId: '',
      },
    })),
    saveConfig: vi.fn(),
    removeConfig: vi.fn(),
  }
}

describe('ProfileScene', () => {
  it('persists preferences into the injected demo store', () => {
    const storage = createMemoryStorage()
    render(<ProfileScene storage={storage} />)

    fireEvent.click(screen.getByRole('button', { name: /增肌/ }))

    expect(
      JSON.parse(storage.getItem('fridge-profile-v1') ?? '{}'),
    ).toMatchObject({ fitness: 'gain' })
  })

  it('shows one concise credential entry before living preferences', async () => {
    const { container } = render(
      <ProfileScene credentials={credentials()} onToast={vi.fn()} />,
    )
    expect(
      await screen.findByRole('button', { name: /密钥配置/ }),
    ).toHaveTextContent('2 项待配置')
    expect(container.querySelectorAll('.profile-card')[0]).toHaveClass(
      'credential-entry-card',
    )
    expect(
      screen.queryByText(/BYOK|Image2|Web storage|请求端点/i),
    ).toBeNull()
  })

  it('opens the unified center with both capability rows', async () => {
    render(<ProfileScene credentials={credentials()} onToast={vi.fn()} />)
    fireEvent.click(
      await screen.findByRole('button', { name: /密钥配置/ }),
    )
    expect(screen.getByRole('heading', { name: '密钥配置' })).toBeVisible()
    expect(screen.getByRole('button', { name: /智能助手/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /食谱插画/ })).toBeVisible()
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
