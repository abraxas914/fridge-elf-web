import type { AudioPort, ClockPort, InventoryPort, MotionPort } from './ports'

export interface AppRuntime {
  clock: ClockPort
  audio: AudioPort
  motion: MotionPort
  inventory: InventoryPort
}

export function createAppRuntime(runtime: AppRuntime): AppRuntime {
  return runtime
}
