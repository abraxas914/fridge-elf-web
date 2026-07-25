import { describe, expect, it } from 'vitest'
import {
  credentialPreset,
  providerPresetsFor,
} from './providerPresets'

describe('credential provider presets', () => {
  it('always offers custom service', () => {
    for (const capability of [
      'assistant',
      'recipe-illustration',
      'speech-recognition',
    ] as const) {
      const presets = providerPresetsFor(capability)
      expect(
        presets.some((preset) => preset.id === 'custom'),
      ).toBe(true)
    }
  })

  it('uses Qwen ASR only as the default speech recognition preset', () => {
    const presets = providerPresetsFor('speech-recognition')

    expect(presets[0]).toMatchObject({
      id: 'qwen',
      label: '千问',
      protocol: 'qwen-input-audio',
      suggestedModelId: 'qwen3-asr-flash',
    })
    expect(presets.find((preset) => preset.id === 'custom')).toMatchObject({
      protocol: 'openai-audio-transcription',
    })
    expect(providerPresetsFor('assistant')).toHaveLength(1)
    expect(providerPresetsFor('recipe-illustration')).toHaveLength(1)
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
