import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLandingReveal } from './useLandingReveal'

type ObserverCallback = IntersectionObserverCallback

function RevealProbe() {
  const { revealRef, isVisible } = useLandingReveal<HTMLDivElement>()
  return (
    <div ref={revealRef} data-testid="probe" data-visible={isVisible}>
      probe
    </div>
  )
}

describe('useLandingReveal', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reveals content immediately when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)

    render(<RevealProbe />)

    expect(screen.getByTestId('probe')).toHaveAttribute('data-visible', 'true')
  })

  it('keeps content visible after it first enters the viewport', () => {
    let callback: ObserverCallback | undefined
    const disconnect = vi.fn()

    class IntersectionObserverMock {
      constructor(nextCallback: ObserverCallback) {
        callback = nextCallback
      }

      observe() {}
      disconnect = disconnect
      unobserve() {}
      takeRecords() {
        return []
      }
      root = null
      rootMargin = ''
      thresholds = [0.18]
    }

    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
    render(<RevealProbe />)

    expect(screen.getByTestId('probe')).toHaveAttribute('data-visible', 'false')

    act(() => {
      callback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(screen.getByTestId('probe')).toHaveAttribute('data-visible', 'true')
    expect(disconnect).toHaveBeenCalled()
  })
})
