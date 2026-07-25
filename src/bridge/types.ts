export interface InventoryItem {
  id: string
  name: string
  quantity: string
  storage: string
  expiryDate: string
  addedDate?: string
  status: string
  revision?: number
}

export interface AddInventoryItem {
  name: string
  quantity: string
  storage: string
  expiryDate: string
  addedDate?: string
}

export interface MqttStatus {
  connected: boolean
  detail: string
}

export interface AssistantShoppingItem {
  name: string
  quantity: string
  reason: string
}

export interface AssistantRecipe {
  name: string
  reason: string
  availableIngredients: string[]
  missingIngredients: string[]
  steps: string[]
}

export interface AssistantReply {
  answer: string
  recipes: AssistantRecipe[]
  shoppingItems: AssistantShoppingItem[]
  suggestShopping: boolean
}

export interface DisplayState {
  mode: 'home' | 'note' | 'meals' | 'calendar' | 'inventory'
  note: string
  meals: [string, string, string]
  date: string
  calendarText: string
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
  | {
      type: 'assistant-result'
      payload: {
        requestId: string
        result?: AssistantReply
        error?: string
      }
    }
  | {
      type: 'speech-result'
      payload: {
        requestId: string
        text?: string
        error?: string
      }
    }
