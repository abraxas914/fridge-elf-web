import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  buildIllustrationPrompt,
  compileRecipePlan,
  isIllustrationStyleId,
} from '../../src/illustration/recipePlan'

export interface IllustrationEnvironment {
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
const ALLOWED_KEYS = ['page', 'recipeText', 'style']

function jsonError(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    {
      status,
      headers: {
        'cache-control': 'no-store',
      },
    },
  )
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
          model: 'gpt-image-2',
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
  if (request.method !== 'POST') {
    return jsonError(405, 'METHOD_NOT_ALLOWED', '仅支持 POST 请求')
  }

  const tokenSecret = environment.DEMO_TOKEN_SECRET
  const token = request.headers.get('x-demo-token') ?? ''
  if (
    !tokenSecret ||
    tokenSecret.length < 16 ||
    !isValidDemoToken(token, tokenSecret)
  ) {
    return jsonError(401, 'INVALID_DEMO_TOKEN', '演示链接无效或已过期')
  }

  if (!environment.IMAGE_API_KEY) {
    return jsonError(
      503,
      'IMAGE_API_NOT_CONFIGURED',
      '图片服务尚未配置',
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'INVALID_JSON', '请求正文必须是 JSON')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError(400, 'INVALID_BODY', '请求字段不合法')
  }
  const record = body as Record<string, unknown>
  if (
    Object.keys(record).sort().join(',') !== ALLOWED_KEYS.join(',') ||
    !isIllustrationStyleId(record.style) ||
    typeof record.recipeText !== 'string' ||
    record.recipeText.length === 0 ||
    record.recipeText.length > MAX_RECIPE_LENGTH ||
    !Number.isInteger(record.page)
  ) {
    return jsonError(400, 'INVALID_BODY', '风格、食谱正文或页码不合法')
  }

  let plan
  try {
    plan = compileRecipePlan(record.recipeText)
  } catch (error) {
    return jsonError(
      422,
      'INVALID_RECIPE',
      error instanceof Error ? error.message : '无法解析食谱',
    )
  }
  const pageNumber = record.page as number
  if (pageNumber < 1 || pageNumber > plan.pages.length) {
    return jsonError(400, 'INVALID_PAGE', '页码超出食谱范围')
  }

  const prompt = buildIllustrationPrompt(plan, record.style, pageNumber)
  const image = await generateImage(
    environment.IMAGE_API_ENDPOINT ?? DEFAULT_IMAGE_ENDPOINT,
    environment.IMAGE_API_KEY,
    prompt,
    fetcher,
    sleep,
  )
  if (!image) {
    return jsonError(
      502,
      'IMAGE_GENERATION_FAILED',
      '图片生成暂时失败，请稍后重试',
    )
  }

  return new Response(image, {
    status: 200,
    headers: {
      'cache-control': 'no-store',
      'content-length': String(image.byteLength),
      'content-type': 'image/png',
      'x-content-type-options': 'nosniff',
      'x-recipe-page': String(pageNumber),
      'x-recipe-pages': String(plan.pages.length),
    },
  })
}
