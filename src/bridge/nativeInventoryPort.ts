import type { InventoryPort } from '../app/ports'
import { createNativeBridge } from './nativeBridge'

export function createNativeInventoryPort(): InventoryPort | null {
  if (!window.NativeBridge) return null
  return createNativeBridge(window.NativeBridge, window)
}
