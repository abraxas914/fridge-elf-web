import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  buildRecipePlanFromStructuredRecipe,
  buildIllustrationPrompt,
  compileRecipePlan,
  isIllustrationStyleId,
  normalizeIllustrationStyleId,
  type IllustrationStyleId,
  type RecipePlan,
} from '../../src/illustration/recipePlan.js'
import { demoCorsHeaders, demoJsonError } from './demoCors.js'
import {
  verifyDemoSession,
  type DemoEnvironment,
} from './demoSession.js'

export interface IllustrationEnvironment extends DemoEnvironment {
  HEADLESS_IMAGE_GATEWAY_BASE_URL?: string
  HEADLESS_IMAGE_GATEWAY_API_KEY?: string
  HEADLESS_IMAGE_GATEWAY_MODEL?: string
  IMAGE_API_ENDPOINT?: string
  IMAGE_API_KEY?: string
  DEMO_TOKEN_SECRET?: string
}

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

const DEFAULT_IMAGE_ENDPOINT =
  'https://api.iotwq.top/v1/images/generations'
const MAX_RECIPE_LENGTH = 4_000
const MAX_IMAGE_BYTES = 4_200_000
const RETRY_DELAYS = [1_000, 3_000] as const
const V1_ALLOWED_KEYS = [
  'contractVersion',
  'pageIndexes',
  'recipe',
  'styleId',
]
const LEGACY_ALLOWED_KEYS = ['page', 'recipeText', 'style']

interface ParsedIllustrationRequest {
  plan: RecipePlan
  styleId: IllustrationStyleId
  pageNumber: number
}

function hasExactKeys(record: Record<string, unknown>, keys: string[]) {
  return Object.keys(record).sort().join(',') === keys.join(',')
}

function parseIllustrationBody(
  record: Record<string, unknown>,
): ParsedIllustrationRequest {
  if (hasExactKeys(record, V1_ALLOWED_KEYS)) {
    if (
      record.contractVersion !== 1 ||
      !isIllustrationStyleId(record.styleId) ||
      !Array.isArray(record.pageIndexes) ||
      record.pageIndexes.length !== 1 ||
      !Number.isInteger(record.pageIndexes[0])
    ) {
      throw new Error('契约版本、风格或页码不合法')
    }
    return {
      plan: buildRecipePlanFromStructuredRecipe(record.recipe),
      styleId: record.styleId,
      pageNumber: record.pageIndexes[0] as number,
    }
  }

  if (hasExactKeys(record, LEGACY_ALLOWED_KEYS)) {
    const styleId = normalizeIllustrationStyleId(record.style)
    if (
      !styleId ||
      typeof record.recipeText !== 'string' ||
      record.recipeText.length === 0 ||
      record.recipeText.length > MAX_RECIPE_LENGTH ||
      !Number.isInteger(record.page)
    ) {
      throw new Error('旧版风格、食谱正文或页码不合法')
    }
    return {
      plan: compileRecipePlan(record.recipeText),
      styleId,
      pageNumber: record.page as number,
    }
  }

  throw new Error('请求字段不符合 Fridge Elf V1 契约')
}

function signature(secret: string, expires: string) {
  return createHmac('sha256', secret).update(expires).digest('base64url')
}

export async function createDemoToken(
  secret: string,
  expiresAtMilliseconds: number,
) {
  const expires = String(Math.floor(expiresAtMilliseconds / 1_000))
  return `${expires}.${signature(secret, expires)}`
}

function isValidDemoToken(token: string, secret: string) {
  const [expires, supplied, ...extra] = token.split('.')
  if (!expires || !supplied || extra.length > 0 || !/^\d+$/.test(expires)) {
    return false
  }
  if (Number(expires) <= Math.floor(Date.now() / 1_000)) return false
  const expected = Buffer.from(signature(secret, expires))
  const candidate = Buffer.from(supplied)
  return (
    expected.length === candidate.length &&
    timingSafeEqual(expected, candidate)
  )
}

function isPng(bytes: Uint8Array) {
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
  return pngSignature.every((value, index) => bytes[index] === value)
}

function imageGatewayUrl(baseUrl: string) {
  const base = baseUrl.replace(/\/+$/, '')
  if (base.endsWith('/images/generations')) return base
  return base.endsWith('/v1')
    ? `${base}/images/generations`
    : `${base}/v1/images/generations`
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  return authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''
}

async function parseProviderImage(response: Response) {
  if (!response.ok) return null
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return null
  }
  const encoded = (
    payload as { data?: Array<{ b64_json?: unknown }> } | undefined
  )?.data?.[0]?.b64_json
  if (typeof encoded !== 'string' || encoded.length === 0) return null
  const bytes = Uint8Array.from(Buffer.from(encoded, 'base64'))
  if (!isPng(bytes) || bytes.byteLength > MAX_IMAGE_BYTES) return null
  return bytes
}

async function generateImage(
  endpoint: string,
  apiKey: string,
  prompt: string,
  model: string,
  fetcher: Fetcher,
  sleep: (milliseconds: number) => Promise<unknown>,
) {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt += 1) {
    let response: Response | null = null
    try {
      response = await fetcher(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          size: '1024x1536',
          quality: 'auto',
          output_format: 'png',
          n: 1,
        }),
        signal: AbortSignal.timeout(55_000),
      })
    } catch {
      response = null
    }

    if (response?.ok) {
      const image = await parseProviderImage(response)
      if (image) return image
    } else if (
      response &&
      response.status !== 429 &&
      response.status < 500
    ) {
      break
    }

    if (attempt < RETRY_DELAYS.length) {
      await sleep(RETRY_DELAYS[attempt])
    }
  }
  return null
}

export async function handleIllustrationRequest(
  request: Request,
  environment: IllustrationEnvironment,
  fetcher: Fetcher = fetch,
  sleep: (milliseconds: number) => Promise<unknown> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
) {
  const cors = demoCorsHeaders(request)
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
    return demoJsonError(
      405,
      'METHOD_NOT_ALLOWED',
      '仅支持 POST 请求',
      cors,
    )
  }

  const sessionSecret = environment.DEMO_SESSION_SECRET
  const sessionIsValid =
    !!sessionSecret &&
    sessionSecret.length >= 16 &&
    verifyDemoSession(bearerToken(request), sessionSecret)
  const legacySecret = environment.DEMO_TOKEN_SECRET
  const legacyToken = request.headers.get('x-demo-token') ?? ''
  const legacyTokenIsValid =
    !!legacySecret &&
    legacySecret.length >= 16 &&
    isValidDemoToken(legacyToken, legacySecret)
  if (!sessionIsValid && !legacyTokenIsValid) {
    return demoJsonError(
      401,
      'DEMO_SESSION_REQUIRED',
      '演示会话已失效，请刷新后重试',
      cors,
    )
  }

  const imageBaseUrl =
    environment.HEADLESS_IMAGE_GATEWAY_BASE_URL?.trim() ||
    environment.IMAGE_API_ENDPOINT?.trim() ||
    DEFAULT_IMAGE_ENDPOINT
  const imageApiKey =
    environment.HEADLESS_IMAGE_GATEWAY_API_KEY?.trim() ||
    environment.IMAGE_API_KEY?.trim()
  const imageModel =
    environment.HEADLESS_IMAGE_GATEWAY_MODEL?.trim() || 'gpt-image-2'
  if (!imageApiKey) {
    return demoJsonError(
      503,
      'IMAGE_API_NOT_CONFIGURED',
      '图片服务尚未配置',
      cors,
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return demoJsonError(
      400,
      'INVALID_JSON',
      '请求正文必须是 JSON',
      cors,
    )
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return demoJsonError(400, 'INVALID_BODY', '请求字段不合法', cors)
  }
  const record = body as Record<string, unknown>
  let parsed: ParsedIllustrationRequest
  try {
    parsed = parseIllustrationBody(record)
  } catch (error) {
    return demoJsonError(
      400,
      'INVALID_BODY',
      error instanceof Error ? error.message : '请求字段不合法',
      cors,
    )
  }
  const { plan, styleId, pageNumber } = parsed
  if (pageNumber < 1 || pageNumber > plan.pages.length) {
    return demoJsonError(400, 'INVALID_PAGE', '页码超出食谱范围', cors)
  }

  const prompt = buildIllustrationPrompt(plan, styleId, pageNumber)
  const image = await generateImage(
    imageGatewayUrl(imageBaseUrl),
    imageApiKey,
    prompt,
    imageModel,
    fetcher,
    sleep,
  )
  if (!image) {
    return demoJsonError(
      502,
      'IMAGE_GENERATION_FAILED',
      '图片生成暂时失败，请稍后重试',
      cors,
    )
  }

  cors.set('content-length', String(image.byteLength))
  cors.set('content-type', 'image/png')
  cors.set('x-content-type-options', 'nosniff')
  cors.set('x-fridge-elf-contract', '1')
  cors.set('x-recipe-page', String(pageNumber))
  cors.set('x-recipe-pages', String(plan.pages.length))
  return new Response(image, {
    status: 200,
    headers: cors,
  })
}
