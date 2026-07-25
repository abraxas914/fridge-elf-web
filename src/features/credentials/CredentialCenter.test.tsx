import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CredentialPort } from '../../app/ports'
import type {
  AiCapability,
  CredentialSummaries,
  CredentialSummary,
} from './types'
import { CredentialCenter } from './CredentialCenter'

function credentials(): CredentialPort {
  let values: CredentialSummaries = {
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
  }
  return {
    getSummaries: vi.fn(async () => structuredClone(values)),
    saveConfig: vi.fn(async (input) => {
      const summary: CredentialSummary = {
        capability: input.capability,
        status: 'saved',
        providerId: input.providerId,
        providerLabel: input.providerLabel,
        modelId: input.modelId,
      }
      values = { ...values, [input.capability]: summary }
      return summary
    }),
    removeConfig: vi.fn(async (capability: AiCapability) => {
      const summary: CredentialSummary = {
        capability,
        status: 'not_configured',
        providerId: '',
        providerLabel: '',
        modelId: '',
      }
      values = { ...values, [capability]: summary }
      return summary
    }),
  }
}

describe('CredentialCenter', () => {
  it('configures assistant and illustration independently', async () => {
    render(
      <CredentialCenter
        credentials={credentials()}
        onBack={vi.fn()}
        onToast={vi.fn()}
      />,
    )

    expect(await screen.findByRole('button', { name: /智能助手/ }))
      .toHaveTextContent('食谱推荐与问答')
    expect(screen.getByRole('button', { name: /食谱插画/ }))
      .toHaveTextContent('生成四种插画风格')
    expect(
      screen.queryByText(/BYOK|Image2|Web storage|请求端点/i),
    ).toBeNull()
  })

  it('saves the manufacturer model id without inventing one', async () => {
    const port = credentials()
    render(
      <CredentialCenter
        credentials={port}
        onBack={vi.fn()}
        onToast={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /食谱插画/ }))
    fireEvent.change(screen.getByLabelText('服务商'), {
      target: { value: 'Acme AI' },
    })
    fireEvent.change(screen.getByLabelText('模型 ID'), {
      target: { value: 'acme-image-v2' },
    })
    fireEvent.change(screen.getByLabelText('服务地址'), {
      target: { value: 'https://api.acme.test/v1/images/generations' },
    })
    fireEvent.change(screen.getByLabelText('访问密钥'), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(port.saveConfig).toHaveBeenCalledWith({
        capability: 'recipe-illustration',
        providerId: 'custom',
        providerLabel: 'Acme AI',
        modelId: 'acme-image-v2',
        endpoint: 'https://api.acme.test/v1/images/generations',
        apiKey: 'secret',
      })
    })
  })
})
