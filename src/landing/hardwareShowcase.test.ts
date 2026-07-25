import { describe, expect, it } from 'vitest'
import { hardwareShowcase } from './hardwareShowcase'

describe('hardwareShowcase', () => {
  it('keeps only the approved versioned prototype image', () => {
    expect(hardwareShowcase).toEqual({
      images: ['/assets/hardware/fridge-elf-prototype-01-v1.webp'],
    })
    expect(Object.keys(hardwareShowcase)).toEqual(['images'])
  })
})
