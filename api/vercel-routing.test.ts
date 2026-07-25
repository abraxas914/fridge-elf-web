import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Vercel API packaging', () => {
  it('keeps function entrypoints flat while preserving public release URLs', () => {
    expect(existsSync(resolve('api/release.ts'))).toBe(true)
    expect(existsSync(resolve('api/download.ts'))).toBe(true)
    expect(existsSync(resolve('api/releases/latest.ts'))).toBe(false)
    expect(existsSync(resolve('api/download/android.ts'))).toBe(false)

    const config = JSON.parse(readFileSync(resolve('vercel.json'), 'utf8')) as {
      rewrites?: Array<{ source: string; destination: string }>
    }
    expect(config.rewrites).toEqual(
      expect.arrayContaining([
        {
          source: '/api/releases/latest',
          destination: '/api/release',
        },
        {
          source: '/api/download/android',
          destination: '/api/download',
        },
      ]),
    )
  })
})
