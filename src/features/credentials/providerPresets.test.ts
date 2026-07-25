import { describe, expect, it } from 'vitest'
import {
  credentialPreset,
  providerPresetsFor,
} from './providerPresets'

describe('credential provider presets', () => {
  it('never exposes DashScope and always offers custom service', () => {
    for (const capability of [
      'assistant',
      'recipe-illustration',
    ] as const) {
      const presets = providerPresetsFor(capability)
      expect(
        presets.some((preset) => preset.id === 'custom'),
      ).toBe(true)
      expect(JSON.stringify(presets)).not.toMatch(/dashscope/i)
    }
  })

  it('does not invent a model id for custom services', () => {
    expect(
      credentialPreset('recipe-illustration', 'custom'),
    ).toMatchObject({
      id: 'custom',
      suggestedModelId: '',
      endpoint: '',
    })
  })
})
