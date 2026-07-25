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
  inventory: Array<{
    name: string
    quantity: string
    category: string
    expiryLevel: 'normal' | 'soon' | 'urgent'
  }>
  plannedMeals: Array<{
    day: string
    meal: 'dinner'
    recipeName: string
  }>
  missingItems: string[]
  availableRecipes: Array<{
    id: string
    name: string
  }>
  preferences?: {
    taste?: string[]
    healthGoal?: string
    householdMode?: string
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

const MAX_BODY_LENGTH = 32_000
const MAX_MESSAGE_LENGTH = 800
const MAX_OUTPUT_LENGTH = 8_000
const REQUEST_TIMEOUT_MS = 45_000

const AGENT_SYSTEM = [
  '你是“冰箱精灵”黑客松 Demo 的只读 Recipe Agent。',
  '只使用用户消息和给定的模拟世界快照回答。',
  '不得声称访问真实设备，不得修改库存、采购、三餐、便签或 Profile。',
  '不得返回工具调用、代码或动作指令。',
  'recipeId 只能使用 availableRecipes 中已经存在的 ID。',
  '只输出 JSON：{"answer":"...","suggestions":[{"title":"...","reason":"...","recipeId":"可选"}],"notices":["可选"]}。',
  '使用简短、自然的中文。',
].join('\n')

const RECOMMEND_SYSTEM = [
  '你是“冰箱精灵”黑客松 Demo 的今日推荐助手。',
  '根据只读模拟库存优先推荐临期且现有食材可以完成的菜谱。',
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

function parseSnapshot(value: unknown): DemoWorldSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (
    !Array.isArray(record.inventory) ||
    record.inventory.length > 24 ||
    !Array.isArray(record.plannedMeals) ||
    record.plannedMeals.length > 21 ||
    !Array.isArray(record.missingItems) ||
    record.missingItems.length > 24 ||
    !Array.isArray(record.availableRecipes) ||
    record.availableRecipes.length > 12
  ) {
    return null
  }

  const inventory = record.inventory.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const food = item as Record<string, unknown>
    if (
      !isShortString(food.name, 40) ||
      !isShortString(food.quantity, 30) ||
      !isShortString(food.category, 30) ||
      !['normal', 'soon', 'urgent'].includes(String(food.expiryLevel))
    ) {
      return null
    }
    return {
      name: food.name,
      quantity: food.quantity,
      category: food.category,
      expiryLevel: food.expiryLevel as 'normal' | 'soon' | 'urgent',
    }
  })
  if (inventory.some((item) => item === null)) return null

  const plannedMeals = record.plannedMeals.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const meal = item as Record<string, unknown>
    if (
      !isShortString(meal.day, 20) ||
      meal.meal !== 'dinner' ||
      !isShortString(meal.recipeName, 80)
    ) {
      return null
    }
    return {
      day: meal.day,
      meal: 'dinner' as const,
      recipeName: meal.recipeName,
    }
  })
  if (plannedMeals.some((item) => item === null)) return null

  if (
    !record.missingItems.every((item) => isShortString(item, 60)) ||
    !record.availableRecipes.every((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false
      const recipe = item as Record<string, unknown>
      return (
        isShortString(recipe.id, 80) &&
        isShortString(recipe.name, 80)
      )
    })
  ) {
    return null
  }

  return {
    inventory: inventory as DemoWorldSnapshot['inventory'],
    plannedMeals: plannedMeals as DemoWorldSnapshot['plannedMeals'],
    missingItems: [...record.missingItems] as string[],
    availableRecipes: record.availableRecipes.map((item) => {
      const recipe = item as { id: string; name: string }
      return { id: recipe.id, name: recipe.name }
    }),
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
  if (!isShortString(record.answer, 1_200)) return null
  const response: DemoAgentResponse = { answer: record.answer.trim() }
  const allowedRecipeIds = new Set(
    snapshot.availableRecipes.map((recipe) => recipe.id),
  )

  if (Array.isArray(record.suggestions)) {
    const suggestions = record.suggestions
      .slice(0, 3)
      .flatMap((value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          return []
        }
        const suggestion = value as Record<string, unknown>
        if (
          !isShortString(suggestion.title, 80) ||
          !isShortString(suggestion.reason, 180)
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
      .filter((value): value is string => isShortString(value, 180))
      .slice(0, 3)
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
  if (rawBody.length === 0 || rawBody.length > MAX_BODY_LENGTH) {
    return demoJsonError(400, 'INVALID_BODY', '请求内容过长', cors)
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
