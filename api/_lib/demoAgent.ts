import {
  beginDemoRequestTrace,
  demoCorsHeaders,
  demoJsonError,
} from './demoCors.js'
import {
  verifyDemoSession,
  type DemoEnvironment,
} from './demoSession.js'

export interface DemoAgentEnvironment extends DemoEnvironment {
  HEADLESS_GATEWAY_BASE_URL?: string
  HEADLESS_GATEWAY_API_KEY?: string
  HEADLESS_GATEWAY_DEFAULT_MODEL?: string
}

export interface DemoWorldSnapshot {
  contextVersion: 2
  inventory: Array<{
    id: string
    name: string
    englishName: string
    quantity: string
    category: string
    kcal: number | null
    storage: string
    expiryDate: string
    expiresInDays: number | null
    addedDate: string
    addedDaysAgo: number | null
    batchCount: number
    status: string
    expiryLevel: 'normal' | 'soon' | 'urgent'
  }>
  plannedMeals: Array<{
    day: string
    meal: 'breakfast' | 'lunch' | 'dinner'
    recipeId: string
    recipeName: string
  }>
  missingItems: string[]
  availableRecipes: Array<{
    id: string
    name: string
    englishName: string
    description: string
    kcal: number
    timeMinutes: number
    tags: string[]
    requiredIngredients: string[]
    steps: string[]
    inventoryMatch: boolean
  }>
  preferences: {
    living: 'solo' | 'family' | 'roomie'
    taste: 'spicy' | 'hunan' | 'clean' | 'custom'
    fitness: 'gain' | 'balance' | 'light'
    routine: 'normal' | 'quick' | 'plan'
    health: string
  }
  contextMeta: {
    contextVersion: 2
    serializedBytes: number
    inventoryCount: number
    plannedMealCount: number
    missingItemCount: number
    recipeCount: number
    truncated: false
    omittedCount: 0
  }
}

export interface DemoAgentResponse {
  answer: string
  suggestions?: Array<{
    title: string
    reason: string
    recipeId?: string
  }>
  notices?: string[]
}

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

const MAX_BODY_BYTES = 128 * 1_024
const MAX_MESSAGE_LENGTH = 4_000
const MAX_OUTPUT_LENGTH = 16_000
const REQUEST_TIMEOUT_MS = 45_000

const AGENT_SYSTEM = [
  '你是“冰箱精灵”黑客松 Demo 的只读 Recipe Agent。',
  '只使用用户消息和给定的模拟世界快照回答。',
  '快照为 Context V2：请综合库存的精确临期天数、存放位置、营养信息、三餐计划、完整菜谱步骤和用户偏好。',
  '若健康与忌口和菜谱冲突，必须在 notices 明确提醒；优先消耗临期食材，同时尊重已有计划。',
  'contextMeta.truncated=false 表示本次模拟世界完整提供，不要假设还有未给出的库存或菜谱。',
  '不得声称访问真实设备，不得修改库存、采购、三餐、便签或 Profile。',
  '不得返回工具调用、代码或动作指令。',
  'recipeId 只能使用 availableRecipes 中已经存在的 ID。',
  '只输出 JSON：{"answer":"...","suggestions":[{"title":"...","reason":"...","recipeId":"可选"}],"notices":["可选"]}。',
  '使用简短、自然的中文。',
].join('\n')

const RECOMMEND_SYSTEM = [
  '你是“冰箱精灵”黑客松 Demo 的今日推荐助手。',
  '根据只读模拟库存优先推荐临期且现有食材可以完成的菜谱。',
  '综合精确临期天数、三餐计划、完整菜谱步骤和用户偏好；健康与忌口冲突必须明确提醒。',
  'contextMeta.truncated=false 表示本次模拟世界完整提供。',
  '不得修改任何状态，不得返回工具调用、代码或动作指令。',
  'recipeId 只能使用 availableRecipes 中已经存在的 ID。',
  '只输出 JSON：{"answer":"...","suggestions":[{"title":"...","reason":"...","recipeId":"可选"}],"notices":["可选"]}。',
  '使用简短、自然的中文。',
].join('\n')

function isShortString(
  value: unknown,
  maximum: number,
  allowEmpty = false,
): value is string {
  return (
    typeof value === 'string' &&
    value.length <= maximum &&
    (allowEmpty || value.trim().length > 0)
  )
}

function isFiniteNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  )
}

function isNullableNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number | null {
  return value === null || isFiniteNumber(value, minimum, maximum)
}

function isStringArray(
  value: unknown,
  maximumItems: number,
  maximumLength: number,
) {
  return (
    Array.isArray(value) &&
    value.length <= maximumItems &&
    value.every((item) => isShortString(item, maximumLength))
  )
}

function utf8Bytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}

function parseSnapshot(value: unknown): DemoWorldSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (
    record.contextVersion !== 2 ||
    !Array.isArray(record.inventory) ||
    record.inventory.length > 100 ||
    !Array.isArray(record.plannedMeals) ||
    record.plannedMeals.length > 42 ||
    !Array.isArray(record.missingItems) ||
    record.missingItems.length > 100 ||
    !Array.isArray(record.availableRecipes) ||
    record.availableRecipes.length > 50 ||
    !record.preferences ||
    typeof record.preferences !== 'object' ||
    Array.isArray(record.preferences) ||
    !record.contextMeta ||
    typeof record.contextMeta !== 'object' ||
    Array.isArray(record.contextMeta)
  ) {
    return null
  }

  const inventory = record.inventory.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const food = item as Record<string, unknown>
    if (
      !isShortString(food.id, 120) ||
      !isShortString(food.name, 80) ||
      !isShortString(food.englishName, 120, true) ||
      !isShortString(food.quantity, 60) ||
      !['ingredient', 'drink', 'other', 'unknown'].includes(
        String(food.category),
      ) ||
      !isNullableNumber(food.kcal, 0, 10_000) ||
      !isShortString(food.storage, 80) ||
      !isShortString(food.expiryDate, 40, true) ||
      !isNullableNumber(food.expiresInDays, -3_650, 3_650) ||
      !isShortString(food.addedDate, 40, true) ||
      !isNullableNumber(food.addedDaysAgo, 0, 3_650) ||
      !isFiniteNumber(food.batchCount, 0, 1_000) ||
      !isShortString(food.status, 80) ||
      !['normal', 'soon', 'urgent'].includes(String(food.expiryLevel))
    ) {
      return null
    }
    return {
      id: food.id,
      name: food.name,
      englishName: food.englishName,
      quantity: food.quantity,
      category: food.category,
      kcal: food.kcal,
      storage: food.storage,
      expiryDate: food.expiryDate,
      expiresInDays: food.expiresInDays,
      addedDate: food.addedDate,
      addedDaysAgo: food.addedDaysAgo,
      batchCount: food.batchCount,
      status: food.status,
      expiryLevel: food.expiryLevel as 'normal' | 'soon' | 'urgent',
    }
  })
  if (inventory.some((item) => item === null)) return null

  const plannedMeals = record.plannedMeals.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const meal = item as Record<string, unknown>
    if (
      !isShortString(meal.day, 20) ||
      !['breakfast', 'lunch', 'dinner'].includes(String(meal.meal)) ||
      !isShortString(meal.recipeId, 120) ||
      !isShortString(meal.recipeName, 80)
    ) {
      return null
    }
    return {
      day: meal.day,
      meal: meal.meal as 'breakfast' | 'lunch' | 'dinner',
      recipeId: meal.recipeId,
      recipeName: meal.recipeName,
    }
  })
  if (plannedMeals.some((item) => item === null)) return null

  if (
    !record.missingItems.every((item) => isShortString(item, 100)) ||
    !record.availableRecipes.every((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false
      const recipe = item as Record<string, unknown>
      return (
        isShortString(recipe.id, 120) &&
        isShortString(recipe.name, 120) &&
        isShortString(recipe.englishName, 160, true) &&
        isShortString(recipe.description, 1_500) &&
        isFiniteNumber(recipe.kcal, 0, 10_000) &&
        isFiniteNumber(recipe.timeMinutes, 0, 1_440) &&
        isStringArray(recipe.tags, 20, 60) &&
        isStringArray(recipe.requiredIngredients, 50, 100) &&
        isStringArray(recipe.steps, 30, 500) &&
        typeof recipe.inventoryMatch === 'boolean'
      )
    })
  ) {
    return null
  }

  const preferences = record.preferences as Record<string, unknown>
  if (
    !['solo', 'family', 'roomie'].includes(String(preferences.living)) ||
    !['spicy', 'hunan', 'clean', 'custom'].includes(
      String(preferences.taste),
    ) ||
    !['gain', 'balance', 'light'].includes(String(preferences.fitness)) ||
    !['normal', 'quick', 'plan'].includes(String(preferences.routine)) ||
    !isShortString(preferences.health, 120, true)
  ) {
    return null
  }
  const submittedMeta = record.contextMeta as Record<string, unknown>
  if (
    submittedMeta.contextVersion !== 2 ||
    submittedMeta.truncated !== false ||
    submittedMeta.omittedCount !== 0
  ) {
    return null
  }

  const context = {
    contextVersion: 2 as const,
    inventory: inventory as DemoWorldSnapshot['inventory'],
    plannedMeals: plannedMeals as DemoWorldSnapshot['plannedMeals'],
    missingItems: [...record.missingItems] as string[],
    availableRecipes: record.availableRecipes.map((item) => {
      const recipe = item as DemoWorldSnapshot['availableRecipes'][number]
      return {
        id: recipe.id,
        name: recipe.name,
        englishName: recipe.englishName,
        description: recipe.description,
        kcal: recipe.kcal,
        timeMinutes: recipe.timeMinutes,
        tags: [...recipe.tags],
        requiredIngredients: [...recipe.requiredIngredients],
        steps: [...recipe.steps],
        inventoryMatch: recipe.inventoryMatch,
      }
    }),
    preferences: {
      living: preferences.living as DemoWorldSnapshot['preferences']['living'],
      taste: preferences.taste as DemoWorldSnapshot['preferences']['taste'],
      fitness: preferences.fitness as DemoWorldSnapshot['preferences']['fitness'],
      routine: preferences.routine as DemoWorldSnapshot['preferences']['routine'],
      health: preferences.health as string,
    },
  }
  return {
    ...context,
    contextMeta: {
      contextVersion: 2,
      serializedBytes: utf8Bytes(context),
      inventoryCount: context.inventory.length,
      plannedMealCount: context.plannedMeals.length,
      missingItemCount: context.missingItems.length,
      recipeCount: context.availableRecipes.length,
      truncated: false,
      omittedCount: 0,
    },
  }
}

function parseGatewayContent(
  raw: string,
  snapshot: DemoWorldSnapshot,
): DemoAgentResponse | null {
  if (raw.length === 0 || raw.length > MAX_OUTPUT_LENGTH) return null
  const normalized = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(normalized)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }
  const record = parsed as Record<string, unknown>
  if (!isShortString(record.answer, 2_500)) return null
  const response: DemoAgentResponse = { answer: record.answer.trim() }
  const allowedRecipeIds = new Set(
    snapshot.availableRecipes.map((recipe) => recipe.id),
  )

  if (Array.isArray(record.suggestions)) {
    const suggestions = record.suggestions
      .slice(0, 5)
      .flatMap((value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          return []
        }
        const suggestion = value as Record<string, unknown>
        if (
          !isShortString(suggestion.title, 80) ||
          !isShortString(suggestion.reason, 400)
        ) {
          return []
        }
        const safe: {
          title: string
          reason: string
          recipeId?: string
        } = {
          title: suggestion.title.trim(),
          reason: suggestion.reason.trim(),
        }
        if (
          isShortString(suggestion.recipeId, 80) &&
          allowedRecipeIds.has(suggestion.recipeId)
        ) {
          safe.recipeId = suggestion.recipeId
        }
        return [safe]
      })
    if (suggestions.length > 0) response.suggestions = suggestions
  }

  if (Array.isArray(record.notices)) {
    const notices = record.notices
      .filter((value): value is string => isShortString(value, 300))
      .slice(0, 5)
      .map((value) => value.trim())
    if (notices.length > 0) response.notices = notices
  }
  return response
}

function gatewayUrl(baseUrl: string) {
  const base = baseUrl.replace(/\/+$/, '')
  return base.endsWith('/v1')
    ? `${base}/chat/completions`
    : `${base}/v1/chat/completions`
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  return authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''
}

export async function handleDemoAgentRequest(
  request: Request,
  environment: DemoAgentEnvironment,
  mode: 'agent' | 'recommend',
  fetcher: Fetcher = fetch,
) {
  const route =
    mode === 'agent'
      ? '/api/demo/agent'
      : '/api/demo/recommend'
  const trace = beginDemoRequestTrace(request, route)
  try {
    const response = await handleDemoAgentRequestCore(
      request,
      environment,
      mode,
      fetcher,
      trace.requestId,
      trace,
    )
    return trace.finish(response)
  } catch {
    trace.failed('UNHANDLED_SERVER_ERROR')
    throw new Error('Demo agent request failed')
  }
}

async function handleDemoAgentRequestCore(
  request: Request,
  environment: DemoAgentEnvironment,
  mode: 'agent' | 'recommend',
  fetcher: Fetcher,
  requestId: string,
  trace: ReturnType<typeof beginDemoRequestTrace>,
) {
  const cors = demoCorsHeaders(request, requestId)
  if (!cors) {
    return demoJsonError(
      403,
      'ORIGIN_NOT_ALLOWED',
      '当前来源无法使用演示服务',
    )
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (request.method !== 'POST') {
    return demoJsonError(405, 'METHOD_NOT_ALLOWED', '仅支持 POST 请求', cors)
  }

  const sessionSecret = environment.DEMO_SESSION_SECRET
  const token = bearerToken(request)
  if (
    !sessionSecret ||
    sessionSecret.length < 16 ||
    !verifyDemoSession(token, sessionSecret)
  ) {
    return demoJsonError(
      401,
      'DEMO_SESSION_REQUIRED',
      '演示会话已失效，请刷新后重试',
      cors,
    )
  }

  const baseUrl = environment.HEADLESS_GATEWAY_BASE_URL?.trim()
  const apiKey = environment.HEADLESS_GATEWAY_API_KEY?.trim()
  const model = environment.HEADLESS_GATEWAY_DEFAULT_MODEL?.trim()
  if (!baseUrl || !apiKey || !model) {
    return demoJsonError(
      503,
      'AGENT_NOT_CONFIGURED',
      '在线建议暂时不可用',
      cors,
    )
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return demoJsonError(400, 'INVALID_BODY', '请求内容不完整', cors)
  }
  if (rawBody.length === 0) {
    return demoJsonError(400, 'INVALID_BODY', '请求内容不完整', cors)
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return demoJsonError(
      413,
      'CONTEXT_TOO_LARGE',
      '模拟世界数据超过 128KB，请缩小后重试',
      cors,
    )
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return demoJsonError(400, 'INVALID_JSON', '请求正文必须是 JSON', cors)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return demoJsonError(400, 'INVALID_BODY', '请求内容不合法', cors)
  }
  const record = body as Record<string, unknown>
  const snapshot = parseSnapshot(record.snapshot)
  const message =
    mode === 'agent' && isShortString(record.message, MAX_MESSAGE_LENGTH)
      ? record.message.trim()
      : ''
  if (!snapshot || (mode === 'agent' && !message)) {
    return demoJsonError(400, 'INVALID_BODY', '问题或模拟世界数据不合法', cors)
  }

  const system = mode === 'agent' ? AGENT_SYSTEM : RECOMMEND_SYSTEM
  const userContent =
    mode === 'agent'
      ? JSON.stringify({ question: message, snapshot })
      : JSON.stringify(snapshot)

  try {
    const upstream = await fetcher(gatewayUrl(baseUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent },
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (upstream.status === 429) {
      trace.upstreamFailure('UPSTREAM_RATE_LIMITED', 429)
      const retryAfter = upstream.headers.get('retry-after')
      if (retryAfter && /^\d{1,4}$/.test(retryAfter)) {
        cors.set('retry-after', retryAfter)
      }
      return demoJsonError(
        429,
        'DEMO_RATE_LIMITED',
        '今天来访的人有点多，请稍后再问我',
        cors,
      )
    }
    if (!upstream.ok) {
      trace.upstreamFailure('UPSTREAM_HTTP_ERROR', upstream.status)
      return demoJsonError(
        502,
        'AGENT_UNAVAILABLE',
        '在线建议暂时走神了',
        cors,
      )
    }
    let payload: unknown
    try {
      payload = await upstream.json()
    } catch {
      payload = null
    }
    const content = (
      payload as {
        choices?: Array<{ message?: { content?: unknown } }>
      } | null
    )?.choices?.[0]?.message?.content
    const response =
      typeof content === 'string'
        ? parseGatewayContent(content, snapshot)
        : null
    if (!response) {
      trace.upstreamFailure('UPSTREAM_RESPONSE_INVALID', 502)
      return demoJsonError(
        502,
        'AGENT_UNAVAILABLE',
        '在线建议暂时走神了',
        cors,
      )
    }
    return Response.json(response, { headers: cors })
  } catch {
    trace.upstreamFailure('UPSTREAM_NETWORK_ERROR', 502)
    return demoJsonError(
      502,
      'AGENT_UNAVAILABLE',
      '在线建议暂时走神了',
      cors,
    )
  }
}
