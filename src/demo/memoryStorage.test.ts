import { describe, expect, it } from 'vitest'
import { createMemoryStorage } from './memoryStorage'

describe('DemoStateStore', () => {
  it('isolates each demo world', () => {
    const first = createMemoryStorage()
    first.setItem('fridge-profile-v1', '{"taste":"clean"}')

    const second = createMemoryStorage()

    expect(second.getItem('fridge-profile-v1')).toBeNull()
  })

  it('supports reset without browser persistence', () => {
    const storage = createMemoryStorage()
    storage.setItem('key', 'value')
    expect(storage.getItem('key')).toBe('value')

    storage.removeItem('key')
    expect(storage.getItem('key')).toBeNull()

    storage.setItem('a', '1')
    storage.clear()
    expect(storage.getItem('a')).toBeNull()
  })
})
