export type AiCapability = 'assistant' | 'recipe-illustration'

export type CredentialStatus =
  | 'not_configured'
  | 'saved'
  | 'verified'
  | 'needs_attention'

export interface CredentialSummary {
  capability: AiCapability
  status: CredentialStatus
  providerId: string
  providerLabel: string
  modelId: string
}

export interface SaveCredentialInput {
  capability: AiCapability
  providerId: string
  providerLabel: string
  modelId: string
  endpoint: string
  apiKey: string
}

export interface ProviderPreset {
  id: string
  capability: AiCapability
  label: string
  protocol: 'openai-compatible' | 'anthropic'
  endpoint: string
  suggestedModelId: string
}

export type CredentialSummaries = Record<
  AiCapability,
  CredentialSummary
>
