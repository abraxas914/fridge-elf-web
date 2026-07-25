import type {
  AddInventoryItem,
  InventoryItem,
  MqttStatus,
  NativeEvent,
} from '../bridge/types'

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
  getMqttStatus(): Promise<MqttStatus>
  subscribe(listener: (event: NativeEvent) => void): () => void
}
