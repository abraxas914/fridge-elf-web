import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RootApp } from './RootApp'

const runtimeMocks = vi.hoisted(() => ({
  runtimes: [] as Array<{ id: number; dispose: ReturnType<typeof vi.fn> }>,
  create: vi.fn(),
}))

vi.mock('./LandingPage', () => ({
  LandingPage: () => <main>LANDING PAGE</main>,
}))
vi.mock('./App', () => ({
  App: ({
    inventoryRuntime,
    onRestartDemo,
  }: {
    inventoryRuntime: { id: number }
    onRestartDemo: () => void
  }) => (
    <main>
      DEMO APP {inventoryRuntime.id}
      <button type="button" onClick={onRestartDemo}>
        RESET DEMO
      </button>
    </main>
  ),
}))
vi.mock('./demo/demoRuntime', () => ({
  createDemoRuntime: runtimeMocks.create,
}))

describe('RootApp', () => {
  beforeEach(() => {
    runtimeMocks.runtimes.length = 0
    runtimeMocks.create.mockImplementation(() => {
      const runtime = {
        id: runtimeMocks.runtimes.length + 1,
        dispose: vi.fn(),
      }
      runtimeMocks.runtimes.push(runtime)
      return runtime
    })
  })

  it('renders the landing page at the domain root', () => {
    window.history.replaceState({}, '', '/')
    render(<RootApp />)
    expect(screen.getByText('LANDING PAGE')).toBeVisible()
  })

  it('renders the interactive application at /demo', async () => {
    window.history.replaceState({}, '', '/demo')
    render(<RootApp />)
    expect(await screen.findByText(/DEMO APP 1/)).toBeVisible()
  })

  it('renders the interactive application when the host canonicalizes /demo/', async () => {
    window.history.replaceState({}, '', '/demo/')
    render(<RootApp />)
    expect(await screen.findByText(/DEMO APP 1/)).toBeVisible()
  })

  it('disposes and replaces the complete runtime on reset and unmount', async () => {
    window.history.replaceState({}, '', '/demo')
    const view = render(<RootApp />)
    expect(await screen.findByText(/DEMO APP 1/)).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'RESET DEMO' }))

    expect(runtimeMocks.runtimes[0].dispose).toHaveBeenCalledOnce()
    expect(await screen.findByText(/DEMO APP 2/)).toBeVisible()
    view.unmount()
    expect(runtimeMocks.runtimes[1].dispose).toHaveBeenCalledOnce()
  })
})
