import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RootApp } from './RootApp'

vi.mock('./LandingPage', () => ({
  LandingPage: () => <main>LANDING PAGE</main>,
}))
vi.mock('./App', () => ({
  App: () => <main>DEMO APP</main>,
}))

describe('RootApp', () => {
  it('renders the landing page at the domain root', () => {
    window.history.replaceState({}, '', '/')
    render(<RootApp />)
    expect(screen.getByText('LANDING PAGE')).toBeVisible()
  })

  it('renders the interactive application at /demo', async () => {
    window.history.replaceState({}, '', '/demo')
    render(<RootApp />)
    expect(await screen.findByText('DEMO APP')).toBeVisible()
  })
})
