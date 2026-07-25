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
    protocol: 'openai-compatible',
    endpoint: '',
    suggestedModelId: '',
  }
}

export function providerPresetsFor(
  capability: AiCapability,
): ProviderPreset[] {
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
