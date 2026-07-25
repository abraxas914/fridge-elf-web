import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AssistantPort } from '../../app/ports'
import type { AssistantJob } from './types'
import { AssistantResult } from './AssistantResult'

describe('AssistantResult', () => {
  it('renders a configured assistant reply', async () => {
    const assistant: AssistantPort = {
      ask: vi.fn(),
      startAssistant: vi.fn(async (): Promise<AssistantJob> => ({
        id: 'assistant-1',
        status: 'succeeded',
        reply: '可以做番茄鸡蛋。',
      })),
      getAssistantJob: vi.fn(),
    }
    render(
      <AssistantResult assistant={assistant} message="今晚吃什么？" />,
    )
    expect(await screen.findByText('可以做番茄鸡蛋。')).toBeVisible()
  })
})
