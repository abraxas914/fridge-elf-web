import type {
  AiCapability,
  ProviderPreset,
} from './types'

function customPreset(
  capability: AiCapability,
): ProviderPreset {
  return {
    id: 'custom',
    capability,
    label: '自定义服务',
    protocol:
      capability === 'speech-recognition'
        ? 'openai-audio-transcription'
        : 'openai-compatible',
    endpoint: '',
    suggestedModelId: '',
  }
}

export function providerPresetsFor(
  capability: AiCapability,
): ProviderPreset[] {
  if (capability === 'speech-recognition') {
    return [
      {
        id: 'qwen',
        capability,
        label: '千问',
        protocol: 'qwen-input-audio',
        endpoint:
          'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        suggestedModelId: 'qwen3-asr-flash',
      },
      customPreset(capability),
    ]
  }
  return [customPreset(capability)]
}

export function credentialPreset(
  capability: AiCapability,
  id: string,
): ProviderPreset {
  return (
    providerPresetsFor(capability).find(
      (preset) => preset.id === id,
    ) ?? customPreset(capability)
  )
}
