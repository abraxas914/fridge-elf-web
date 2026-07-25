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

  it('packages every public Demo gateway and gives generation enough time', () => {
    for (const entrypoint of [
      'api/demo/session.ts',
      'api/demo/agent.ts',
      'api/demo/recommend.ts',
      'api/demo/transcribe.ts',
      'api/illustrate.ts',
    ]) {
      expect(existsSync(resolve(entrypoint))).toBe(true)
    }

    const config = JSON.parse(readFileSync(resolve('vercel.json'), 'utf8')) as {
      functions?: Record<string, { maxDuration?: number }>
    }
    expect(config.functions?.['api/demo/agent.ts']?.maxDuration).toBeGreaterThanOrEqual(60)
    expect(config.functions?.['api/demo/recommend.ts']?.maxDuration).toBeGreaterThanOrEqual(60)
    expect(config.functions?.['api/demo/transcribe.ts']?.maxDuration).toBeGreaterThanOrEqual(300)
    expect(config.functions?.['api/illustrate.ts']?.maxDuration).toBeGreaterThanOrEqual(60)
  })

  it('runs China-bound media gateways from the nearest supported Asian region', () => {
    const config = JSON.parse(readFileSync(resolve('vercel.json'), 'utf8')) as {
      functions?: Record<string, { regions?: string[] }>
    }

    expect(config.functions?.['api/demo/transcribe.ts']?.regions).toEqual([
      'hnd1',
    ])
    expect(config.functions?.['api/illustrate.ts']?.regions).toEqual([
      'hnd1',
    ])
  })

  it('allows same-origin microphone capture and documents only empty server-side Demo variables', () => {
    const example = readFileSync(resolve('.env.example'), 'utf8')
    for (const name of [
      'DEMO_SESSION_SECRET',
      'HEADLESS_GATEWAY_BASE_URL',
      'HEADLESS_GATEWAY_API_KEY',
      'HEADLESS_GATEWAY_DEFAULT_MODEL',
      'HEADLESS_IMAGE_GATEWAY_BASE_URL',
      'HEADLESS_IMAGE_GATEWAY_API_KEY',
      'HEADLESS_IMAGE_GATEWAY_MODEL',
      'HEADLESS_SPEECH_GATEWAY_BASE_URL',
      'HEADLESS_SPEECH_GATEWAY_API_KEY',
      'HEADLESS_SPEECH_GATEWAY_MODEL',
      'HEADLESS_SPEECH_GATEWAY_PROTOCOL',
    ]) {
      expect(example).toMatch(new RegExp(`^${name}=$`, 'm'))
    }
    const config = readFileSync(resolve('vercel.json'), 'utf8')
    expect(config).toContain('microphone=(self)')
    expect(example).not.toMatch(/^VITE_.*(?:KEY|SECRET|TOKEN)=/m)
    expect(example).not.toMatch(/^sk-[A-Za-z0-9]/m)
  })

  it('documents the transcription route as a Vercel Firewall deployment invariant', () => {
    const spec = readFileSync(
      resolve('docs/WEB_PREVIEW_SPEC.md'),
      'utf8',
    )
    expect(spec).toContain('Vercel Firewall')
    expect(spec).toContain('/api/demo/transcribe')
    expect(spec).toContain('麦克风仅允许同源 Demo 页面使用')
    expect(spec).not.toContain(
      '禁止 iframe、摄像头、麦克风和地理位置',
    )
  })
})
