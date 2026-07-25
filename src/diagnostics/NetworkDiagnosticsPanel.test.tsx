import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NetworkDiagnosticsPanel } from './NetworkDiagnosticsPanel'
import {
  networkDiagnostics,
  type NetworkDiagnosticEvent,
} from './networkDiagnostics'

const failedAgentEvent: NetworkDiagnosticEvent = {
  requestId: 'mobile-request-123',
  operation: 'agent',
  stage: 'failure',
  target: 'https://fridge-elf-app.vercel.app/api/demo/agent',
  timestamp: '2026-07-26T00:00:00.000Z',
  status: 429,
  code: 'DEMO_RATE_LIMITED',
  durationMs: 842,
}

describe('NetworkDiagnosticsPanel', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/demo?debug=network')
    networkDiagnostics.clear()
  })

  it('shows request metadata without sensitive request contents', () => {
    networkDiagnostics.record(failedAgentEvent)

    render(<NetworkDiagnosticsPanel />)
    fireEvent.click(
      screen.getByRole('button', { name: '网络诊断' }),
    )

    const dialog = screen.getByRole('dialog', {
      name: '网络诊断',
    })
    expect(dialog).toHaveTextContent('AGENT')
    expect(dialog).toHaveTextContent('FAILURE')
    expect(dialog).toHaveTextContent('429')
    expect(dialog).toHaveTextContent('DEMO_RATE_LIMITED')
    expect(dialog).toHaveTextContent('842ms')
    expect(dialog).toHaveTextContent('mobile-r')
  })

  it('runs a fresh anonymous session self-test', async () => {
    const probe = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    })
    render(<NetworkDiagnosticsPanel probe={probe} />)
    fireEvent.click(
      screen.getByRole('button', { name: '网络诊断' }),
    )

    fireEvent.click(
      screen.getByRole('button', { name: '运行自检' }),
    )

    await waitFor(() => expect(probe).toHaveBeenCalledOnce())
    expect(screen.getByText('SESSION 200')).toBeVisible()
  })

  it('copies a safe JSON report and clears request history', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    networkDiagnostics.record(failedAgentEvent)
    render(<NetworkDiagnosticsPanel />)
    fireEvent.click(
      screen.getByRole('button', { name: '网络诊断' }),
    )

    fireEvent.click(
      screen.getByRole('button', { name: '复制报告' }),
    )

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const report = writeText.mock.calls[0]?.[0] as string
    expect(report).toContain('"requestId": "mobile-request-123"')
    expect(report).not.toContain('authorization')
    expect(screen.getByText('诊断报告已复制')).toBeVisible()

    fireEvent.click(
      screen.getByRole('button', { name: '清空记录' }),
    )
    expect(screen.getByText('暂无请求记录')).toBeVisible()
  })

  it('closes the dialog without removing the debug trigger', () => {
    render(<NetworkDiagnosticsPanel />)
    fireEvent.click(
      screen.getByRole('button', { name: '网络诊断' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: '关闭网络诊断' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '网络诊断' }),
    ).toBeVisible()
  })
})
