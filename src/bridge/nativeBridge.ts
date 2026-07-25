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
  CredentialStatus,
  CredentialSummary,
  SaveCredentialInput,
} from '../features/credentials/types'
import { buildRecipeIllustrationPlan } from '../features/recipeIllustration/recipePlan'
import { buildRecipePagePrompt } from '../features/recipeIllustration/prompt'
import type {
  RecipeIllustrationJob,
  RecipeIllustrationJobPage,
} from '../features/recipeIllustration/types'
import type {
  AddInventoryItem,
  AssistantReply,
  DisplayState,
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
      Object.keys(parsed).length === 1 &&
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
    ...(typeof value.addedDate === 'string'
      ? { addedDate: value.addedDate }
      : {}),
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

const CAPABILITIES = [
  'assistant',
  'recipe-illustration',
] as const satisfies readonly AiCapability[]
const CREDENTIAL_STATUSES = [
  'not_configured',
  'saved',
  'verified',
  'needs_attention',
] as const satisfies readonly CredentialStatus[]

function parseCredentialSummary(
  value: unknown,
  expectedCapability?: AiCapability,
): CredentialSummary {
  if (
    !isRecord(value) ||
    CAPABILITIES.includes(value.capability as AiCapability) === false ||
    CREDENTIAL_STATUSES.includes(value.status as CredentialStatus) === false ||
    typeof value.providerId !== 'string' ||
    typeof value.providerLabel !== 'string' ||
    typeof value.modelId !== 'string' ||
    Object.hasOwn(value, 'endpoint') ||
    Object.hasOwn(value, 'apiKey') ||
    Object.hasOwn(value, 'keyLast4') ||
    (expectedCapability !== undefined &&
      value.capability !== expectedCapability) ||
    (value.status !== 'not_configured' &&
      (!value.providerId || !value.providerLabel || !value.modelId))
  ) {
    throw new NativeBridgeError(
      'INVALID_CREDENTIAL_SUMMARY',
      '密钥配置状态无效',
    )
  }
  return value as unknown as CredentialSummary
}

function parseCredentialSummaries(raw: string): CredentialSummaries {
  const value = parseBridgeJson(raw)
  if (!isRecord(value)) {
    throw new NativeBridgeError(
      'INVALID_CREDENTIAL_SUMMARIES',
      '密钥配置状态无效',
    )
  }
  return {
    assistant: parseCredentialSummary(value.assistant, 'assistant'),
    'recipe-illustration': parseCredentialSummary(
      value['recipe-illustration'],
      'recipe-illustration',
    ),
  }
}

function parseAssistantJob(raw: string): AssistantJob {
  const value = parseBridgeJson(raw)
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !['queued', 'running', 'succeeded', 'failed'].includes(
      String(value.status),
    ) ||
    (value.reply !== undefined && typeof value.reply !== 'string') ||
    (value.error !== undefined &&
      (!isRecord(value.error) ||
        typeof value.error.code !== 'string' ||
        typeof value.error.message !== 'string'))
  ) {
    throw new NativeBridgeError(
      'INVALID_ASSISTANT_JOB',
      '智能助手返回内容无效',
    )
  }
  return value as unknown as AssistantJob
}

function parseRecipeIllustrationPage(
  value: unknown,
): RecipeIllustrationJobPage {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.index) ||
    typeof value.imageUrl !== 'string' ||
    !value.imageUrl.startsWith(
      'https://appassets.androidplatform.net/generated/',
    )
  ) {
    throw new NativeBridgeError(
      'INVALID_RECIPE_ILLUSTRATION_JOB',
      '食谱插画任务格式无效',
    )
  }
  return {
    index: value.index as number,
    imageUrl: value.imageUrl,
  }
}

function parseRecipeIllustrationJob(
  raw: string,
): RecipeIllustrationJob {
  const value = parseBridgeJson(raw)
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !['queued', 'running', 'succeeded', 'failed'].includes(
      String(value.status),
    ) ||
    !Number.isInteger(value.completedPages) ||
    !Number.isInteger(value.totalPages) ||
    !Array.isArray(value.pages) ||
    (value.error !== undefined &&
      (!isRecord(value.error) ||
        typeof value.error.code !== 'string' ||
        typeof value.error.message !== 'string'))
  ) {
    throw new NativeBridgeError(
      'INVALID_RECIPE_ILLUSTRATION_JOB',
      '食谱插画任务格式无效',
    )
  }
  return {
    id: value.id,
    status: value.status as RecipeIllustrationJob['status'],
    completedPages: value.completedPages as number,
    totalPages: value.totalPages as number,
    pages: value.pages.map(parseRecipeIllustrationPage),
    ...(value.error === undefined
      ? {}
      : {
          error: {
            code: (value.error as JsonRecord).code as string,
            message: (value.error as JsonRecord).message as string,
          },
        }),
  }
}

function parseAssistantReply(value: unknown): AssistantReply {
  if (!isRecord(value)) {
    throw new NativeBridgeError(
      'INVALID_ASSISTANT_REPLY',
      '千问返回内容无效',
    )
  }
  return {
    answer:
      typeof value.answer === 'string'
        ? value.answer
        : '千问已完成分析。',
    recipes: Array.isArray(value.recipes)
      ? (value.recipes as AssistantReply['recipes'])
      : [],
    shoppingItems: Array.isArray(value.shoppingItems)
      ? (value.shoppingItems as AssistantReply['shoppingItems'])
      : [],
    suggestShopping: Boolean(value.suggestShopping),
  }
}

function parseConfiguredAssistantReply(raw: string): AssistantReply {
  const trimmed = raw.trim()
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  try {
    return parseAssistantReply(JSON.parse(unfenced))
  } catch {
    return {
      answer: trimmed,
      recipes: [],
      shoppingItems: [],
      suggestShopping: false,
    }
  }
}

function configuredAssistantMessage(input: unknown) {
  const context = JSON.stringify(input).slice(0, 2_800)
  return [
    '你是冰箱食谱助手。请仅返回 JSON，不要使用 Markdown。',
    '格式：{"answer":"简洁中文回答","recipes":[],"shoppingItems":[],"suggestShopping":false}。',
    'recipes 每项包含 name、reason、availableIngredients、missingIngredients、steps。',
    'shoppingItems 每项包含 name、quantity、reason。',
    `用户上下文：${context}`,
  ].join('\n')
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
    if (
      value.type === 'assistant-result' &&
      typeof value.payload.requestId === 'string'
    ) {
      return {
        type: 'assistant-result',
        payload: {
          requestId: value.payload.requestId,
          ...(value.payload.result === undefined
            ? {}
            : { result: parseAssistantReply(value.payload.result) }),
          ...(typeof value.payload.error === 'string'
            ? { error: value.payload.error }
            : {}),
        },
      }
    }
    if (
      value.type === 'speech-result' &&
      typeof value.payload.requestId === 'string'
    ) {
      return {
        type: 'speech-result',
        payload: {
          requestId: value.payload.requestId,
          ...(typeof value.payload.text === 'string'
            ? { text: value.payload.text }
            : {}),
          ...(typeof value.payload.error === 'string'
            ? { error: value.payload.error }
            : {}),
        },
      }
    }
  } catch {
    return null
  }
  return null
}

export interface NativeRuntime {
  inventory: InventoryPort
  credentials: CredentialPort
  assistant: AssistantPort
  recipeIllustration: RecipeIllustrationPort
  speech: SpeechPort
  display: DisplayPort
}

export type NativeBridge = InventoryPort &
  CredentialPort &
  Pick<AssistantPort, 'startAssistant' | 'getAssistantJob'> &
  RecipeIllustrationPort

interface PendingRequest<T> {
  resolve(value: T): void
  reject(error: Error): void
  timer: ReturnType<typeof setTimeout>
}

function nextRequestId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function unavailable(code: string, message: string) {
  return new NativeBridgeError(code, message)
}

export function createNativeRuntime(
  api: NativeBridgeApi,
  hostWindow: Window = window,
): NativeRuntime {
  if (api.getBridgeVersion() !== '1') {
    throw new NativeBridgeError(
      'UNSUPPORTED_BRIDGE_VERSION',
      'NativeBridge 版本不兼容',
    )
  }

  const listeners = new Set<(event: NativeEvent) => void>()
  const assistantRequests = new Map<string, PendingRequest<AssistantReply>>()
  const speechRequests = new Map<string, PendingRequest<string>>()
  let ready = false
  hostWindow.onNativeEvent = (value) => {
    const event = parseEvent(value)
    if (!event) return
    if (event.type === 'assistant-result') {
      const pending = assistantRequests.get(event.payload.requestId)
      if (!pending) return
      clearTimeout(pending.timer)
      assistantRequests.delete(event.payload.requestId)
      if (event.payload.error) {
        pending.reject(
          unavailable('ASSISTANT_FAILED', event.payload.error),
        )
      } else if (event.payload.result) {
        pending.resolve(event.payload.result)
      } else {
        pending.reject(
          unavailable('EMPTY_ASSISTANT_REPLY', '千问返回内容为空'),
        )
      }
      return
    }
    if (event.type === 'speech-result') {
      const pending = speechRequests.get(event.payload.requestId)
      if (!pending) return
      clearTimeout(pending.timer)
      speechRequests.delete(event.payload.requestId)
      if (event.payload.error) {
        pending.reject(unavailable('SPEECH_FAILED', event.payload.error))
      } else if (event.payload.text) {
        pending.resolve(event.payload.text)
      } else {
        pending.reject(unavailable('EMPTY_SPEECH_RESULT', '没有识别到语音'))
      }
      return
    }
    for (const listener of listeners) listener(event)
  }

  const bridge: NativeBridge = {
    async getItems(): Promise<InventoryItem[]> {
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
            input.addedDate,
          ),
        ),
      )
    },
    async removeItem(id) {
      if (!api.removeItem) {
        throw unavailable(
          'REMOVE_UNAVAILABLE',
          '请更新手机 App 后再取出食物',
        )
      }
      parseBridgeJson(api.removeItem(id))
    },
    async updateItemQuantity(id, quantity) {
      if (!api.updateItemQuantity) {
        throw unavailable(
          'UPDATE_UNAVAILABLE',
          '请更新手机 App 后再修改食物数量',
        )
      }
      parseBridgeJson(api.updateItemQuantity(id, quantity))
    },
    async getMqttStatus() {
      return parseStatus(api.getMqttStatus())
    },
    async getSummaries() {
      if (!api.getCredentialSummaries) {
        return {
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
      }
      return parseCredentialSummaries(api.getCredentialSummaries())
    },
    async startAssistant(message: string) {
      if (!api.startAssistantRequest) {
        throw new NativeBridgeError(
          'ASSISTANT_UNAVAILABLE',
          '当前版本暂不支持智能助手',
        )
      }
      return parseAssistantJob(
        api.startAssistantRequest(JSON.stringify({ message })),
      )
    },
    async getAssistantJob(jobId: string) {
      if (!api.getAssistantRequest) {
        throw new NativeBridgeError(
          'ASSISTANT_UNAVAILABLE',
          '当前版本暂不支持智能助手',
        )
      }
      return parseAssistantJob(api.getAssistantRequest(jobId))
    },
    async saveConfig(input: SaveCredentialInput) {
      if (!api.saveCredentialConfig) {
        throw new NativeBridgeError(
          'CREDENTIALS_UNAVAILABLE',
          '当前版本暂不支持密钥配置',
        )
      }
      return parseCredentialSummary(
        parseBridgeJson(
          api.saveCredentialConfig(
            input.capability,
            input.providerId,
            input.providerLabel,
            input.modelId,
            input.endpoint,
            input.apiKey,
          ),
        ),
        input.capability,
      )
    },
    async removeConfig(capability: AiCapability) {
      if (!api.removeCredentialConfig) {
        throw new NativeBridgeError(
          'CREDENTIALS_UNAVAILABLE',
          '当前版本暂不支持密钥配置',
        )
      }
      return parseCredentialSummary(
        parseBridgeJson(api.removeCredentialConfig(capability)),
        capability,
      )
    },
    async start(
      request: Parameters<RecipeIllustrationPort['start']>[0],
    ) {
      const plan = buildRecipeIllustrationPlan(request.recipe)
      const selectedIndexes = new Set(
        request.pageIndexes ?? plan.pages.map((page) => page.index),
      )
      const nativeRequest = {
        contractVersion: request.contractVersion,
        title: plan.recipe.title,
        styleId: request.styleId,
        pages: plan.pages
          .filter((page) => selectedIndexes.has(page.index))
          .map((page) => ({
            index: page.index,
            prompt: buildRecipePagePrompt(
              plan,
              page,
              request.styleId,
            ),
          })),
      }
      return parseRecipeIllustrationJob(
        api.startRecipeIllustration(JSON.stringify(nativeRequest)),
      )
    },
    async getJob(jobId: string) {
      return parseRecipeIllustrationJob(
        api.getRecipeIllustrationJob(jobId),
      )
    },
    async remove(jobId: string) {
      const value = parseBridgeJson(
        api.removeRecipeIllustrationJob(jobId),
      )
      if (!isRecord(value) || value.removed !== true) {
        throw new NativeBridgeError(
          'INVALID_RECIPE_ILLUSTRATION_REMOVE',
          '食谱插画任务删除结果无效',
        )
      }
    },
    subscribe(listener: (event: NativeEvent) => void) {
      listeners.add(listener)
      if (!ready) {
        ready = true
        api.ready()
      }
      return () => listeners.delete(listener)
    },
  }

  const assistant: AssistantPort = {
    startAssistant: bridge.startAssistant,
    getAssistantJob: bridge.getAssistantJob,
    async ask(input) {
      if (api.startAssistantRequest && api.getAssistantRequest) {
        let job = await bridge.startAssistant(
          configuredAssistantMessage(input),
        )
        for (let attempt = 0; attempt < 150; attempt += 1) {
          if (job.status === 'succeeded' && job.reply) {
            return parseConfiguredAssistantReply(job.reply)
          }
          if (job.status === 'failed') {
            throw unavailable(
              'ASSISTANT_FAILED',
              job.error ?? '智能助手请求失败',
            )
          }
          await new Promise((resolve) => setTimeout(resolve, 500))
          job = await bridge.getAssistantJob(job.id)
        }
        throw unavailable('ASSISTANT_TIMEOUT', '智能助手响应超时，请重试')
      }
      if (!api.askAssistant) {
        throw unavailable(
          'ASSISTANT_UNAVAILABLE',
          '请先配置智能助手',
        )
      }
      const requestId = nextRequestId('assistant')
      return new Promise<AssistantReply>((resolve, reject) => {
        const timer = setTimeout(() => {
          assistantRequests.delete(requestId)
          reject(unavailable('ASSISTANT_TIMEOUT', '千问响应超时，请重试'))
        }, 60_000)
        assistantRequests.set(requestId, { resolve, reject, timer })
        try {
          parseBridgeJson(
            api.askAssistant?.(requestId, JSON.stringify(input)) ?? '',
          )
        } catch (error) {
          clearTimeout(timer)
          assistantRequests.delete(requestId)
          reject(
            error instanceof Error
              ? error
              : unavailable('ASSISTANT_FAILED', '千问请求失败'),
          )
        }
      })
    },
  }

  const speech: SpeechPort = {
    start() {
      if (!api.startSpeechRecognition || !api.stopSpeechRecognition) {
        return {
          stop() {},
          result: Promise.reject(
            unavailable(
              'SPEECH_UNAVAILABLE',
              '请在手机 App 中使用按住说话',
            ),
          ),
        }
      }
      const requestId = nextRequestId('speech')
      const result = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          speechRequests.delete(requestId)
          reject(unavailable('SPEECH_TIMEOUT', '语音识别超时，请重试'))
        }, 75_000)
        speechRequests.set(requestId, { resolve, reject, timer })
        try {
          parseBridgeJson(api.startSpeechRecognition?.(requestId) ?? '')
        } catch (error) {
          clearTimeout(timer)
          speechRequests.delete(requestId)
          reject(
            error instanceof Error
              ? error
              : unavailable('SPEECH_FAILED', '语音识别失败'),
          )
        }
      })
      return {
        stop() {
          try {
            parseBridgeJson(api.stopSpeechRecognition?.(requestId) ?? '')
          } catch {
            // The result promise receives recorder-side failures.
          }
        },
        result,
      }
    },
  }

  const display: DisplayPort = {
    async setState(state: DisplayState) {
      if (!api.setDisplayState) {
        throw unavailable(
          'DISPLAY_UNAVAILABLE',
          '请在手机 App 中连接开发板显示屏',
        )
      }
      parseBridgeJson(api.setDisplayState(JSON.stringify(state)))
    },
  }

  return {
    inventory: bridge as InventoryPort,
    credentials: bridge as CredentialPort,
    assistant,
    recipeIllustration: bridge as RecipeIllustrationPort,
    speech,
    display,
  }
}

export function createNativeBridge(
  api: NativeBridgeApi,
  hostWindow: Window = window,
): NativeBridge {
  const runtime = createNativeRuntime(api, hostWindow)
  return {
    ...runtime.inventory,
    ...runtime.credentials,
    startAssistant: runtime.assistant.startAssistant,
    getAssistantJob: runtime.assistant.getAssistantJob,
    ...runtime.recipeIllustration,
  }
}
