import type {
  AssistantPort,
  CredentialPort,
  DisplayPort,
  InventoryPort,
  RecipeIllustrationPort,
  SpeechPort,
} from '../app/ports'
import type { AssistantJob } from '../features/assistant/types'
import type {
  AiCapability,
  CredentialSummaries,
  CredentialSummary,
} from '../features/credentials/types'
import type {
  RecipeIllustrationJob,
} from '../features/recipeIllustration/types'
import { buildRecipeIllustrationPlan } from '../features/recipeIllustration/recipePlan'
import { GOLDEN_FOODS } from '../fixtures/goldenFixture'
import { createNativeRuntime } from './nativeBridge'
import type {
  AddInventoryItem,
  DisplayState,
  InventoryItem,
  NativeEvent,
} from './types'

const STORAGE_KEY = 'life-helper-v2-browser-inventory'
const DISPLAY_STORAGE_KEY = 'life-helper-v2-browser-display'

function fixtureItems(): InventoryItem[] {
  return GOLDEN_FOODS.map((food) => ({
    id: food.id,
    name: food.name,
    quantity: food.quantity,
    storage: '冷藏室',
    expiryDate: food.expiryDate,
    status: '新鲜',
  }))
}

function readItems(storage?: Pick<Storage, 'getItem'>) {
  if (!storage) return fixtureItems()
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
    if (!Array.isArray(parsed)) return fixtureItems()
    return parsed.filter(
      (item): item is InventoryItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.quantity === 'string' &&
        typeof item.storage === 'string' &&
        typeof item.expiryDate === 'string' &&
        typeof item.status === 'string',
    )
  } catch {
    return fixtureItems()
  }
}

export function createBrowserMock(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined =
    typeof localStorage === 'undefined' ? undefined : localStorage,
): InventoryPort {
  let items = readItems(storage)
  const listeners = new Set<(event: NativeEvent) => void>()

  const publishInventory = () => {
    const event: NativeEvent = {
      type: 'inventory-updated',
      payload: { items: items.map((item) => ({ ...item })) },
    }
    for (const listener of listeners) listener(event)
  }

  return {
    async getItems() {
      return items.map((item) => ({ ...item }))
    },
    async addItem(input: AddInventoryItem) {
      const item: InventoryItem = {
        id: `mock-${items.length + 1}`,
        ...input,
        status: '本地预览',
      }
      items = [...items, item]
      storage?.setItem(STORAGE_KEY, JSON.stringify(items))
      publishInventory()
      return { ...item }
    },
    async removeItem(id: string) {
      items = items.filter((item) => item.id !== id)
      storage?.setItem(STORAGE_KEY, JSON.stringify(items))
      publishInventory()
    },
    async updateItemQuantity(id: string, quantity: string) {
      items = items.map((item) =>
        item.id === id ? { ...item, quantity } : item,
      )
      storage?.setItem(STORAGE_KEY, JSON.stringify(items))
      publishInventory()
    },
    async getMqttStatus() {
      return { connected: true, detail: 'BROWSER MOCK' }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export type RuntimeMode = 'native' | 'browser-mock'

export function createBrowserCredentialMock(): CredentialPort {
  let summaries: CredentialSummaries = {
    assistant: {
      capability: 'assistant',
      status: 'not_configured',
      providerId: '',
      providerLabel: '',
      modelId: '',
    },
    'recipe-illustration': {
      capability: 'recipe-illustration',
      status: 'not_configured',
      providerId: '',
      providerLabel: '',
      modelId: '',
    },
  }
  return {
    async getSummaries() {
      return structuredClone(summaries)
    },
    async saveConfig(input) {
      const summary: CredentialSummary = {
        capability: input.capability,
        status: 'saved',
        providerId: input.providerId,
        providerLabel: input.providerLabel,
        modelId: input.modelId,
      }
      summaries = { ...summaries, [input.capability]: summary }
      return structuredClone(summary)
    },
    async removeConfig(capability: AiCapability) {
      const summary: CredentialSummary = {
        capability,
        status: 'not_configured',
        providerId: '',
        providerLabel: '',
        modelId: '',
      }
      summaries = { ...summaries, [capability]: summary }
      return structuredClone(summary)
    },
  }
}

export interface AppRuntime {
  inventory: InventoryPort
  credentials: CredentialPort
  assistant: AssistantPort
  recipeIllustration: RecipeIllustrationPort
  speech: SpeechPort
  display: DisplayPort
  mode: RuntimeMode
}

export function createBrowserAssistantMock(): AssistantPort {
  const jobs = new Map<string, AssistantJob>()
  return {
    async ask() {
      return {
        answer: 'BROWSER MOCK：推荐先做番茄鸡蛋。',
        recipes: [],
        shoppingItems: [],
        suggestShopping: false,
      }
    },
    async startAssistant(message) {
      const job: AssistantJob = {
        id: `assistant-preview-${jobs.size + 1}`,
        status: 'succeeded',
        reply: message.includes('库存')
          ? '可以优先做番茄鸡蛋，现有食材能直接开做。'
          : '建议先做「番茄鸡蛋轻食碗」，约 15 分钟完成。',
      }
      jobs.set(job.id, job)
      return structuredClone(job)
    },
    async getAssistantJob(id) {
      const job = jobs.get(id)
      if (!job) throw new Error('智能助手任务不存在')
      return structuredClone(job)
    },
  }
}

function createBrowserSpeech(): SpeechPort {
  return {
    start() {
      return {
        stop() {},
        result: Promise.resolve('买两盒牛奶'),
      }
    },
  }
}

const PREVIEW_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAA' +
  'DUlEQVR42mP8z8BQDwAFgwJ/lbJNAAAAAElFTkSuQmCC'

export function createBrowserRecipeIllustrationMock():
  RecipeIllustrationPort {
  const jobs = new Map<string, RecipeIllustrationJob>()
  return {
    async start(request) {
      const id = `preview-${jobs.size + 1}`
      const pageIndexes =
        request.pageIndexes ??
        buildRecipeIllustrationPlan(request.recipe).pages.map(
          (page) => page.index,
        )
      const job: RecipeIllustrationJob = {
        id,
        status: 'succeeded',
        completedPages: pageIndexes.length,
        totalPages: pageIndexes.length,
        pages: pageIndexes.map((index) => ({
          index,
          imageUrl: PREVIEW_PIXEL,
        })),
      }
      jobs.set(id, job)
      return structuredClone(job)
    },
    async getJob(jobId) {
      const job = jobs.get(jobId)
      if (!job) throw new Error('食谱插画预览任务不存在')
      return structuredClone(job)
    },
    async remove(jobId) {
      jobs.delete(jobId)
    },
  }
}

function createBrowserDisplay(
  storage: Pick<Storage, 'setItem'> | undefined,
): DisplayPort {
  return {
    async setState(state: DisplayState) {
      storage?.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(state))
    },
  }
}

export function selectInventoryRuntime(
  hostWindow: Window = window,
): AppRuntime {
  if (hostWindow.NativeBridge) {
    try {
      const runtime = createNativeRuntime(
        hostWindow.NativeBridge,
        hostWindow,
      )
      return {
        ...runtime,
        mode: 'native',
      }
    } catch {
      // Fall through to the deterministic browser implementation.
    }
  }
  const storage =
    typeof localStorage === 'undefined' ? undefined : localStorage
  return {
    inventory: createBrowserMock(storage),
    credentials: createBrowserCredentialMock(),
    assistant: createBrowserAssistantMock(),
    recipeIllustration: createBrowserRecipeIllustrationMock(),
    speech: createBrowserSpeech(),
    display: createBrowserDisplay(storage),
    mode: 'browser-mock',
  }
}
