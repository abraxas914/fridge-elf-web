import { describe, expect, it, vi } from 'vitest'
import { handleIllustrationRequest } from './_lib/illustrate'
import { issueDemoSession } from './_lib/demoSession'

const environment = {
  DEMO_SESSION_SECRET: 'demo-session-secret-for-tests',
  HEADLESS_IMAGE_GATEWAY_BASE_URL: 'https://image-gateway.internal',
  HEADLESS_IMAGE_GATEWAY_API_KEY: 'server-only-image-key',
  HEADLESS_IMAGE_GATEWAY_MODEL: 'gpt-image-2',
}

const recipeText = `# 番茄炒蛋
食材：
- 番茄：2个
- 鸡蛋：3个
步骤：
1. 番茄切块。
2. 鸡蛋打散。
3. 炒熟后装盘。`

function request(
  body: unknown,
  options: { origin?: string; authorization?: string; method?: string } = {},
) {
  const token = issueDemoSession(
    environment.DEMO_SESSION_SECRET,
    Date.now(),
  ).token
  const method = options.method ?? 'POST'
  return new Request(
    'https://fridge-elf-app.vercel.app/api/illustrate',
    {
      method,
      headers: {
        authorization:
          options.authorization ?? `Bearer ${token}`,
        'content-type': 'application/json',
        origin: options.origin ?? 'https://fridgeelf.rth1.xyz',
        'x-request-id': 'mobile-image-123',
      },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    },
  )
}

const png = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3,
]).toString('base64')

describe('anonymous demo illustration BFF', () => {
  it('answers Retinbox preflight with the shared Demo CORS policy', async () => {
    const response = await handleIllustrationRequest(
      request({}, { method: 'OPTIONS' }),
      environment,
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://fridgeelf.rth1.xyz',
    )
    expect(response.headers.get('access-control-allow-headers')).toContain(
      'authorization',
    )
    expect(response.headers.get('access-control-allow-headers')).toContain(
      'x-request-id',
    )
  })

  it('requires the anonymous bearer session and never needs a URL token', async () => {
    const response = await handleIllustrationRequest(
      request(
        { style: 'xiaohei', recipeText, page: 1 },
        { authorization: '' },
      ),
      environment,
      vi.fn(),
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: {
        code: 'DEMO_SESSION_REQUIRED',
        message: '演示会话已失效，请刷新后重试',
      },
    })
  })

  it('calls the configured image gateway and returns a validated PNG', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ data: [{ b64_json: png }] }),
    )
    const response = await handleIllustrationRequest(
      request({ style: 'watercolor', recipeText, page: 1 }),
      environment,
      fetcher,
      vi.fn(),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('x-request-id')).toBe(
      'mobile-image-123',
    )
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://fridgeelf.rth1.xyz',
    )
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      Buffer.from(png, 'base64'),
    )
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe(
      'https://image-gateway.internal/v1/images/generations',
    )
    expect(init.headers.authorization).toBe(
      'Bearer server-only-image-key',
    )
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'gpt-image-2',
      quality: 'auto',
      output_format: 'png',
    })
  })

  it('sanitizes provider failures and rejects unapproved origins', async () => {
    const providerFailure = await handleIllustrationRequest(
      request({ style: 'xiaohei', recipeText, page: 1 }),
      environment,
      vi.fn().mockResolvedValue(
        Response.json({ secret: 'raw provider failure' }, { status: 400 }),
      ),
      vi.fn(),
    )
    const badOrigin = await handleIllustrationRequest(
      request(
        { style: 'xiaohei', recipeText, page: 1 },
        { origin: 'https://attacker.example' },
      ),
      environment,
      vi.fn(),
    )

    expect(providerFailure.status).toBe(502)
    expect(JSON.stringify(await providerFailure.json())).not.toContain(
      'provider',
    )
    expect(badOrigin.status).toBe(403)
    expect(badOrigin.headers.has('access-control-allow-origin')).toBe(false)
  })
})
