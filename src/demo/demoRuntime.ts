import { requestDemoAgent } from '../ai/demoApi'
import { buildDemoWorldSnapshot } from '../ai/demoWorld'
import type {
  DemoAgentInput,
  DemoAgentResponse,
  DemoAssistantInventoryItem,
  DemoAssistantInput,
  DemoAssistantReply,
  DemoCapabilities,
  DemoWorldSnapshot,
} from '../ai/types'
import type { AssistantPort, CredentialPort } from '../app/ports'
import { mapNativeInventory } from '../app/inventoryMapper'
import { defaultFavoriteRecipes } from '../app/recipes'
import {
  deriveMissingIngredients,
  loadPlanner,
} from '../app/state'
import {
  createBrowserDisplay,
  createBrowserMock,
  createBrowserSpeech,
  type AppRuntime,
} from '../bridge/browserMock'
import type { AssistantJob } from '../features/assistant/types'
import type {
  AiCapability,
  CredentialSummary,
} from '../features/credentials/types'
import { createMemoryStorage } from './memoryStorage'
import {
  createManagedIllustration,
  type DemoIllustrationRequester,
} from './managedIllustration'

export type DemoAgentRequester = (
  input: DemoAgentInput,
) => Promise<DemoAgentResponse>

export interface DemoRuntimeOptions {
  agentRequester?: DemoAgentRequester
  illustrationRequester?: DemoIllustrationRequester
}

export interface DemoRuntime extends AppRuntime {
  assistant: ManagedAssistantPort
  capabilities: DemoCapabilities
  dispose(): void
}

export interface ManagedAssistantPort extends AssistantPort {
  recommend(input: unknown): Promise<DemoAssistantReply>
}

const MANAGED_PROVIDER = 'Fridge Elf Demo Gateway'

function managedSummary(capability: AiCapability): CredentialSummary {
  return {
    capability,
    status: 'verified',
    providerId: 'managed-demo',
    providerLabel: MANAGED_PROVIDER,
    modelId:
      capability === 'assistant'
        ? 'managed-agent'
        : capability === 'speech-recognition'
          ? 'managed-speech'
          : 'managed-image-2',
  }
}

function createManagedCredentials(): CredentialPort {
  return {
    async getSummaries() {
      return {
        assistant: managedSummary('assistant'),
        'speech-recognition': managedSummary('speech-recognition'),
        'recipe-illustration': managedSummary('recipe-illustration'),
      }
    },
    async saveConfig(input) {
      return managedSummary(input.capability)
    },
    async removeConfig(capability) {
      return managedSummary(capability)
    },
  }
}

function parseVoiceItem(text: string) {
  const normalized = text.trim()
  const milkMatch = normalized.match(/(?:买|加)?\s*([一二两三四五六七八九十\d]+)\s*盒牛奶/)
  const countMap: Record<string, string> = {
    一: '1',
    二: '2',
    两: '2',
    三: '3',
    四: '4',
    五: '5',
    六: '6',
    七: '7',
    八: '8',
    九: '9',
    十: '10',
  }
  if (milkMatch) {
    return {
      name: '牛奶',
      quantity: `${countMap[milkMatch[1]] ?? milkMatch[1]}盒`,
      reason: '语音添加',
    }
  }
  return {
    name: normalized.replace(/^(买|添加|加入)\s*/, '') || '待确认食材',
    quantity: '1份',
    reason: '语音添加',
  }
}

function isDemoAssistantInput(input: unknown): input is DemoAssistantInput {
  if (!input || typeof input !== 'object') return false
  const candidate = input as Partial<DemoAssistantInput>
  return typeof candidate.question === 'string'
}

type OnlineAssistantIntent = 'agent' | 'recommend'
type NormalizedAssistantIntent =
  | OnlineAssistantIntent
  | NonNullable<DemoAssistantInput['intent']>
type NormalizedAssistantInput = {
  intent: NormalizedAssistantIntent
  question: string
  snapshot: DemoWorldSnapshot
}

async function normalizeAssistantInput(
  input: unknown,
  buildSnapshot: (
    input: DemoAssistantInput,
  ) => Promise<DemoWorldSnapshot>,
  forcedIntent?: OnlineAssistantIntent,
): Promise<NormalizedAssistantInput | null> {
  if (!isDemoAssistantInput(input)) return null
  const legacyIntent = (input as { intent?: unknown }).intent
  return {
    intent:
      forcedIntent ??
      (legacyIntent === 'recommend' || legacyIntent === 'agent'
        ? legacyIntent
        : input.intent ?? 'agent'),
    question: input.question,
    snapshot: input.snapshot ?? await buildSnapshot(input),
  }
}

function createManagedAssistant(
  requester: DemoAgentRequester,
  buildSnapshot: (
    input: DemoAssistantInput,
  ) => Promise<DemoWorldSnapshot>,
): ManagedAssistantPort {
  const jobs = new Map<string, AssistantJob>()

  const ask = async (
    rawInput: unknown,
    forcedIntent?: OnlineAssistantIntent,
  ): Promise<DemoAssistantReply> => {
      const input = await normalizeAssistantInput(
        rawInput,
        buildSnapshot,
        forcedIntent,
      )
      if (!input) {
        throw new Error('Demo Agent 请求格式无效')
      }
      if (
        input.intent === 'inventory-voice' ||
        input.intent === 'shopping-voice'
      ) {
        return {
          answer: '已按演示规则解析语音内容。',
          recipes: [],
          shoppingItems: [parseVoiceItem(input.question)],
          suggestShopping: false,
          existingRecipeIds: [],
          notices: [],
        }
      }

      try {
        const response = await requester({
          mode: input.intent,
          ...(input.intent === 'agent'
            ? { message: input.question }
            : {}),
          snapshot: input.snapshot,
        })
        const availableIds = new Set(
          input.snapshot.availableRecipes.map((recipe) => recipe.id),
        )
        const existingRecipeIds = Array.from(
          new Set(
            (response.suggestions ?? [])
              .map((suggestion) => suggestion.recipeId)
              .filter(
                (recipeId): recipeId is string =>
                  typeof recipeId === 'string' &&
                  availableIds.has(recipeId),
              ),
          ),
        )
        return {
          answer: response.answer,
          recipes: [],
          shoppingItems: [],
          suggestShopping: false,
          existingRecipeIds,
          notices: response.notices ?? [],
        }
      } catch {
        return {
          answer:
            '网关暂时繁忙。演示建议：优先选择临期食材能覆盖的菜谱，并先安排到今天的餐次。',
          recipes: [],
          shoppingItems: [],
          suggestShopping: false,
          existingRecipeIds: input.snapshot.availableRecipes
            .slice(0, 2)
            .map((recipe) => recipe.id),
          notices: ['当前展示的是本地演示回退结果'],
        }
      }
  }

  return {
    ask,
    async recommend(input) {
      return ask(input, 'recommend')
    },
    async startAssistant(message) {
      const job: AssistantJob = {
        id: `managed-agent-${jobs.size + 1}`,
        status: 'succeeded',
        reply: message,
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

export function createDemoRuntime(
  options: DemoRuntimeOptions = {},
): DemoRuntime {
  const stateStorage = createMemoryStorage()
  const inventory = createBrowserMock(stateStorage)
  const recipeIllustration = createManagedIllustration(
    options.illustrationRequester,
  )
  const buildSnapshot = async (input: DemoAssistantInput) => {
    const inventoryItems = input.inventory
      ? input.inventory.map(
          (
            item: DemoAssistantInventoryItem,
            index: number,
          ) => ({
            id: `assistant-context-${index + 1}`,
            ...item,
          }),
        )
      : await inventory.getItems()
    const presented = mapNativeInventory(inventoryItems, new Date())
    const planner = input.planner ?? loadPlanner(stateStorage)
    const missingItems =
      input.missingItems ??
      deriveMissingIngredients(
        planner,
        presented.flatMap((food) => [food.key, food.name]),
        defaultFavoriteRecipes(),
      )
    return buildDemoWorldSnapshot({
      inventory: presented,
      planner,
      missingItems,
    })
  }
  return {
    inventory,
    credentials: createManagedCredentials(),
    assistant: createManagedAssistant(
      options.agentRequester ?? requestDemoAgent,
      buildSnapshot,
    ),
    recipeIllustration,
    speech: createBrowserSpeech(),
    display: createBrowserDisplay(stateStorage),
    stateStorage,
    mode: 'browser-mock',
    capabilities: {
      assistant: 'managed',
      recipeIllustration: 'managed',
      speechRecognition: 'managed',
    },
    dispose() {
      recipeIllustration.dispose()
      stateStorage.clear()
    },
  }
}
