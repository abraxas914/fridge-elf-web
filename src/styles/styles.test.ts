import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const stylesRoot = resolve(process.cwd(), 'src/styles')

function readStyle(name: string) {
  const path = `${stylesRoot}/${name}`
  expect(existsSync(path), `${name} must exist`).toBe(true)
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

describe('Life Helper visual source', () => {
  it('keeps the exact approved color tokens', () => {
    const css = readStyle('tokens.css').toLowerCase()
    const tokens = {
      '--bg-page': '#c8c0a8',
      '--bg-cream': '#ebdcb4',
      '--bg-warm': '#dcc89e',
      '--panel': '#f5eac8',
      '--panel-2': '#e8d5a8',
      '--panel-3': '#fbf3db',
      '--mustard': '#d9a868',
      '--mustard-dk': '#b88848',
      '--navy': '#4a6b8f',
      '--navy-dk': '#2e4b6b',
      '--navy-lt': '#6b8fb0',
      '--sage': '#7a9968',
      '--sage-dk': '#5a7a4b',
      '--sage-lt': '#a8c08a',
      '--coral': '#d96b4f',
      '--coral-dk': '#b04a32',
      '--butter': '#e8b84a',
      '--butter-lt': '#f5d078',
      '--peach': '#e89870',
      '--rose': '#c86b7a',
      '--wall': '#c8bfa5',
      '--floor': '#e8dbc4',
      '--floor-dk': '#b89877',
      '--text': '#2b2117',
      '--text-mid': '#5a4530',
      '--text-lt': '#8a7455',
      '--border': '#2b2117',
    }

    for (const [name, value] of Object.entries(tokens)) {
      expect(css).toContain(`${name}: ${value}`)
    }
  })

  it('uses only the four repository-owned relative WOFF2 sources', () => {
    const css = readStyle('fonts.css')
    expect(css.match(/@font-face/g)).toHaveLength(4)
    expect(css).toContain('Silkscreen-Regular.woff2')
    expect(css).toContain('Silkscreen-Bold.woff2')
    expect(css).toContain('VT323-Regular.woff2')
    expect(css).toContain('DotGothic16-Regular.woff2')
    expect(css).not.toMatch(/https?:|fonts\.(googleapis|gstatic)\.com/)
    expect(css).not.toMatch(/url\(\s*["']?\//)
  })

  it('preserves the approved stage and pixel rendering primitives', () => {
    const globalCss = readStyle('global.css')
    const pixelCss = readStyle('pixel.css')

    expect(globalCss).toContain('max-width: 480px')
    expect(globalCss).toContain('height: 100dvh')
    expect(globalCss).toContain('overflow: hidden')
    expect(globalCss).toContain('image-rendering: pixelated')
    expect(pixelCss).toContain('--border-card: 3px')
    expect(pixelCss).toContain('--shadow-card: 3px 3px 0 var(--shadow)')
  })
})
