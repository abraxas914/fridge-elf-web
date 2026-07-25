import type {
  AddInventoryItem,
  AssistantReply,
  DisplayState,
  InventoryItem,
  MqttStatus,
  NativeEvent,
} from '../bridge/types'
import type {
  RecipeIllustrationJob,
  RecipeIllustrationRequest,
} from '../features/recipeIllustration/types'
import type { AssistantJob } from '../features/assistant/types'
import type {
  AiCapability,
  CredentialSummaries,
  CredentialSummary,
  SaveCredentialInput,
} from '../features/credentials/types'

export type AudioCue = 'tick' | 'ding' | 'boop' | 'success' | 'error' | 'wake'

export interface ClockPort {
  now(): Date
  setTimeout(callback: () => void, delayMs: number): number
  clearTimeout(id: number): void
}

export interface AudioPort {
  play(cue: AudioCue): void
  setMuted(muted: boolean): void
}

export interface MotionPort {
  reduced: boolean
}

export interface InventoryPort {
  getItems(): Promise<InventoryItem[]>
  addItem(input: AddInventoryItem): Promise<InventoryItem>
  removeItem(id: string): Promise<void>
  updateItemQuantity(id: string, quantity: string): Promise<void>
  getMqttStatus(): Promise<MqttStatus>
  subscribe(listener: (event: NativeEvent) => void): () => void
}

export interface CredentialPort {
  getSummaries(): Promise<CredentialSummaries>
  saveConfig(input: SaveCredentialInput): Promise<CredentialSummary>
  removeConfig(capability: AiCapability): Promise<CredentialSummary>
}

export interface AssistantPort {
  ask(input: unknown): Promise<AssistantReply>
  recommend?(input: unknown): Promise<AssistantReply>
  startAssistant(message: string): Promise<AssistantJob>
  getAssistantJob(id: string): Promise<AssistantJob>
}

export interface RecipeIllustrationPort {
  start(
    request: RecipeIllustrationRequest,
  ): Promise<RecipeIllustrationJob>
  getJob(jobId: string): Promise<RecipeIllustrationJob>
  remove(jobId: string): Promise<void>
}

export interface SpeechSession<T = string> {
  stop(): void
  result: Promise<T>
}

export interface SpeechPort {
  start(): SpeechSession
}

export interface DisplayPort {
  setState(state: DisplayState): Promise<void>
}

export type StateStoragePort = Pick<
  Storage,
  'clear' | 'getItem' | 'removeItem' | 'setItem'
>
