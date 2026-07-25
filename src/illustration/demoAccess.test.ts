import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readDemoToken } from './demoAccess'

describe('readDemoToken', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('captures the QR token, removes it from the visible URL, and keeps it for refreshes', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState')
    const location = new URL('https://demo.example/recipe?demo=signed-token#page')

    expect(readDemoToken(location, window.sessionStorage)).toBe('signed-token')
    expect(window.sessionStorage.getItem('fridge-elf-demo-token')).toBe(
      'signed-token',
    )
    expect(replaceState).toHaveBeenCalledWith(
      window.history.state,
      '',
      '/recipe#page',
    )

    expect(
      readDemoToken(
        new URL('https://demo.example/recipe'),
        window.sessionStorage,
      ),
    ).toBe('signed-token')
  })

  it('migrates an existing Smart Tag session token without losing access', () => {
    window.sessionStorage.setItem('smart-tag-demo-token', 'legacy-token')

    expect(
      readDemoToken(
        new URL('https://demo.example/recipe'),
        window.sessionStorage,
      ),
    ).toBe('legacy-token')
    expect(window.sessionStorage.getItem('fridge-elf-demo-token')).toBe(
      'legacy-token',
    )
  })
})
