import type { InventoryPort } from '../app/ports'
import type {
  AddInventoryItem,
  InventoryItem,
  MqttStatus,
  NativeEvent,
} from './types'

type JsonRecord = Record<string, unknown>

export class NativeBridgeError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'NativeBridgeError'
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseBridgeJson(raw: string): unknown {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      isRecord(parsed) &&
      isRecord(parsed.error) &&
      typeof parsed.error.code === 'string' &&
      typeof parsed.error.message === 'string'
    ) {
      throw new NativeBridgeError(
        parsed.error.code,
        parsed.error.message,
      )
    }
    return parsed
  } catch (error) {
    if (error instanceof NativeBridgeError) throw error
    throw new NativeBridgeError(
      'INVALID_BRIDGE_JSON',
      '原生数据格式无效，已保留本地预览',
    )
  }
}

function parseItem(value: unknown): InventoryItem {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.quantity !== 'string' ||
    typeof value.storage !== 'string' ||
    typeof value.expiryDate !== 'string' ||
    typeof value.status !== 'string' ||
    (value.revision !== undefined && typeof value.revision !== 'number')
  ) {
    throw new NativeBridgeError(
      'INVALID_ITEM',
      '原生库存条目格式无效，已保留本地预览',
    )
  }
  return {
    id: value.id,
    name: value.name,
    quantity: value.quantity,
    storage: value.storage,
    expiryDate: value.expiryDate,
    status: value.status,
    ...(value.revision === undefined ? {} : { revision: value.revision }),
  }
}

function parseItems(raw: string): InventoryItem[] {
  const value = parseBridgeJson(raw)
  if (!Array.isArray(value)) {
    throw new NativeBridgeError(
      'INVALID_ITEMS',
      '原生库存列表格式无效，已保留本地预览',
    )
  }
  return value.map(parseItem)
}

function parseStatusValue(value: unknown): MqttStatus {
  if (
    !isRecord(value) ||
    typeof value.connected !== 'boolean' ||
    typeof value.detail !== 'string'
  ) {
    throw new NativeBridgeError(
      'INVALID_MQTT_STATUS',
      '连接状态格式无效',
    )
  }
  return { connected: value.connected, detail: value.detail }
}

function parseStatus(raw: string): MqttStatus {
  return parseStatusValue(parseBridgeJson(raw))
}

function parseEvent(value: unknown): NativeEvent | null {
  if (!isRecord(value) || !isRecord(value.payload)) return null
  try {
    if (value.type === 'mqtt-status') {
      return {
        type: 'mqtt-status',
        payload: parseStatusValue(value.payload),
      }
    }
    if (
      value.type === 'inventory-updated' &&
      Array.isArray(value.payload.items)
    ) {
      return {
        type: 'inventory-updated',
        payload: { items: value.payload.items.map(parseItem) },
      }
    }
  } catch {
    return null
  }
  return null
}

export function createNativeBridge(
  api: NativeBridgeApi,
  hostWindow: Window = window,
): InventoryPort {
  if (api.getBridgeVersion() !== '1') {
    throw new NativeBridgeError(
      'UNSUPPORTED_BRIDGE_VERSION',
      'NativeBridge 版本不兼容',
    )
  }

  const listeners = new Set<(event: NativeEvent) => void>()
  let ready = false
  hostWindow.onNativeEvent = (value) => {
    const event = parseEvent(value)
    if (!event) return
    for (const listener of listeners) listener(event)
  }

  return {
    async getItems() {
      return parseItems(api.getItems())
    },
    async addItem(input: AddInventoryItem) {
      return parseItem(
        parseBridgeJson(
          api.addItem(
            input.name,
            input.quantity,
            input.storage,
            input.expiryDate,
          ),
        ),
      )
    },
    async getMqttStatus() {
      return parseStatus(api.getMqttStatus())
    },
    subscribe(listener) {
      listeners.add(listener)
      if (!ready) {
        ready = true
        api.ready()
      }
      return () => listeners.delete(listener)
    },
  }
}
