import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function summarizeModelPayload(payload) {
  return Array.isArray(payload?.data)
    ? `data-array:${payload.data.length}`
    : 'unknown'
}

export function summarizeCompletionPayload(payload) {
  return typeof payload?.choices?.[0]?.message?.content === 'string'
    ? 'choices-message-content'
    : 'unknown'
}

export function formatProbeReport(result) {
  return [
    `models status=${result.modelsStatus} shape=${result.modelsShape}`,
    `completion status=${result.completionStatus} model=${result.completionModel} shape=${result.completionShape}`,
  ].join('\n')
}

function gatewayUrl(baseUrl, path) {
  const base = baseUrl.replace(/\/+$/, '')
  return base.endsWith('/v1')
    ? `${base}${path}`
    : `${base}/v1${path}`
}

function parseEnv(source) {
  const result = {}
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/,
    )
    if (!match) continue
    let value = match[2]
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[match[1]] = value
  }
  return result
}

export async function loadLocalEnvironment(path = resolve('.env.local')) {
  return parseEnv(await readFile(path, 'utf8'))
}

export async function probeGateway(environment, fetcher = fetch) {
  const baseUrl = environment.HEADLESS_GATEWAY_BASE_URL?.trim()
  const apiKey = environment.HEADLESS_GATEWAY_API_KEY?.trim()
  const model = environment.HEADLESS_GATEWAY_DEFAULT_MODEL?.trim()
  if (!baseUrl || !apiKey || !model) {
    throw new Error('Missing headless gateway environment')
  }
  const headers = { authorization: `Bearer ${apiKey}` }

  let modelsStatus = 0
  let modelsShape = 'network-error'
  try {
    const response = await fetcher(gatewayUrl(baseUrl, '/models'), {
      headers,
      signal: AbortSignal.timeout(20_000),
    })
    modelsStatus = response.status
    modelsShape = summarizeModelPayload(await response.json())
  } catch {
    modelsStatus = 0
  }

  let completionStatus = 0
  let completionShape = 'network-error'
  try {
    const response = await fetcher(
      gatewayUrl(baseUrl, '/chat/completions'),
      {
        method: 'POST',
        headers: {
          ...headers,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: '请只回复 OK，用于结构探针。',
            },
          ],
          stream: false,
        }),
        signal: AbortSignal.timeout(45_000),
      },
    )
    completionStatus = response.status
    completionShape = summarizeCompletionPayload(await response.json())
  } catch {
    completionStatus = 0
  }

  return {
    modelsStatus,
    modelsShape,
    completionStatus,
    completionModel: model,
    completionShape,
  }
}

async function main() {
  const environment = {
    ...process.env,
    ...(await loadLocalEnvironment()),
  }
  const result = await probeGateway(environment)
  process.stdout.write(`${formatProbeReport(result)}\n`)
  if (
    result.modelsStatus !== 200 ||
    result.completionStatus !== 200 ||
    result.completionShape !== 'choices-message-content'
  ) {
    process.exitCode = 1
  }
}

const entry = process.argv[1] ? resolve(process.argv[1]) : ''
if (entry === fileURLToPath(import.meta.url)) {
  await main()
}
