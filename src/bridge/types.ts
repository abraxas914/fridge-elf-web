export interface InventoryItem {
  id: string
  name: string
  quantity: string
  storage: string
  expiryDate: string
  status: string
  revision?: number
}

export interface AddInventoryItem {
  name: string
  quantity: string
  storage: string
  expiryDate: string
}

export interface MqttStatus {
  connected: boolean
  detail: string
}

export type NativeEvent =
  | {
      type: 'mqtt-status'
      payload: MqttStatus
    }
  | {
      type: 'inventory-updated'
      payload: { items: InventoryItem[] }
    }
