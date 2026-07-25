import { randomUUID } from 'node:crypto'
import { demoCorsHeaders, demoJsonError } from './demoCors.js'
import {
  verifyDemoSession,
  type DemoEnvironment,
} from './demoSession.js'

export interface TranscribeEnvironment extends DemoEnvironment {
  HEADLESS_SPEECH_GATEWAY_BASE_URL?: string
  HEADLESS_SPEECH_GATEWAY_API_KEY?: string
  HEADLESS_SPEECH_GATEWAY_MODEL?: string
  HEADLESS_SPEECH_GATEWAY_PROTOCOL?: string
}

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

export interface TranscribeDependencies {
  fetcher: Fetcher
  sleep: (milliseconds: number) => Promise<unknown>
  maxPolls: number
  pollIntervalMs: number
}

interface UploadPolicy {
  accessKeyId: string
  policy: string
  signature: string
  uploadDir: string
  uploadHost: string
  objectAcl: 'private'
  forbidOverwrite: 'true'
}

const MAX_AUDIO_BYTES = 3 * 1024 * 1024
const MAX_RESULT_BYTES = 200_000
const MAX_TRANSCRIPT_LENGTH = 2_000
const REQUEST_TIMEOUT_MS = 20_000
const POLL_REQUEST_TIMEOUT_MS = 10_000
const DEFAULT_MAX_POLLS = 60
const DEFAULT_POLL_INTERVAL_MS = 2_000
const ALLOWED_MIME_TYPES = new Map([
  ['audio/webm', 'webm'],
  ['audio/ogg', 'ogg'],
  ['audio/mp4', 'mp4'],
  ['audio/wav', 'wav'],
  ['audio/mpeg', 'mp3'],
])

class SpeechGatewayError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly publicMessage: string,
    readonly retryAfter?: string,
  ) {
    super(code)
    this.name = 'SpeechGatewayError'
  }
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  return authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''
}

function cleanString(value: unknown, maximum = 1_000) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximum
    ? value
    : null
}

function dashscopeOrigin(baseUrl: string) {
  try {
    const url = new URL(baseUrl)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'dashscope.aliyuncs.com' ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

function isAliyunOssUrl(
  raw: string,
  requireOriginOnly = false,
) {
  try {
    const url = new URL(raw)
    const ossHost =
      /^[a-z0-9][a-z0-9.-]*\.oss-[a-z0-9-]+\.aliyuncs\.com$/i
        .test(url.hostname)
    return (
      url.protocol === 'https:' &&
      ossHost &&
      !url.username &&
      !url.password &&
      !url.port &&
      (!requireOriginOnly ||
        (url.pathname === '/' && !url.search && !url.hash))
    )
  } catch {
    return false
  }
}

async function fetchUpstream(
  fetcher: Fetcher,
  input: string,
  init: RequestInit,
) {
  let response: Response
  try {
    response = await fetcher(input, init)
  } catch {
    throw new SpeechGatewayError(
      502,
      'TRANSCRIPTION_UNAVAILABLE',
      '语音识别暂时不可用，请重试',
    )
  }
  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after') ?? ''
    throw new SpeechGatewayError(
      429,
      'DEMO_RATE_LIMITED',
      '今天来访的人有点多，请稍后再试',
      /^\d{1,4}$/.test(retryAfter) ? retryAfter : undefined,
    )
  }
  if (!response.ok) {
    throw new SpeechGatewayError(
      502,
      'TRANSCRIPTION_UNAVAILABLE',
      '语音识别暂时不可用，请重试',
    )
  }
  return response
}

async function safeJson(response: Response) {
  try {
    const text = await response.text()
    if (!text || text.length > MAX_RESULT_BYTES) return null
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function parseUploadPolicy(payload: unknown): UploadPolicy | null {
  const data = (
    payload as { data?: Record<string, unknown> } | null
  )?.data
  if (!data) return null
  const accessKeyId = cleanString(data.oss_access_key_id)
  const policy = cleanString(data.policy, 10_000)
  const signature = cleanString(data.signature, 10_000)
  const uploadDir = cleanString(data.upload_dir)
  const uploadHost = cleanString(data.upload_host)
  const objectAcl = data.x_oss_object_acl
  const forbidOverwrite = data.x_oss_forbid_overwrite
  if (
    !accessKeyId ||
    !policy ||
    !signature ||
    !uploadDir ||
    !uploadHost ||
    objectAcl !== 'private' ||
    forbidOverwrite !== 'true' ||
    uploadDir.startsWith('/') ||
    uploadDir.includes('..') ||
    !/^[A-Za-z0-9/_-]+$/.test(uploadDir) ||
    !isAliyunOssUrl(uploadHost, true)
  ) {
    return null
  }
  return {
    accessKeyId,
    policy,
    signature,
    uploadDir: uploadDir.replace(/\/+$/, ''),
    uploadHost,
    objectAcl,
    forbidOverwrite,
  }
}

function parseTaskId(payload: unknown) {
  const taskId = (
    payload as { output?: { task_id?: unknown } } | null
  )?.output?.task_id
  return typeof taskId === 'string' &&
    /^[A-Za-z0-9_-]{1,128}$/.test(taskId)
    ? taskId
    : null
}

function parseTask(payload: unknown) {
  const output = (
    payload as {
      output?: {
        task_status?: unknown
        results?: unknown
      }
    } | null
  )?.output
  if (!output || typeof output.task_status !== 'string') return null
  return {
    status: output.task_status,
    results: Array.isArray(output.results) ? output.results : [],
  }
}

function transcriptionUrl(results: unknown[]) {
  for (const result of results) {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      continue
    }
    const record = result as Record<string, unknown>
    if (
      record.subtask_status === 'SUCCEEDED' &&
      typeof record.transcription_url === 'string' &&
      isAliyunOssUrl(record.transcription_url)
    ) {
      return record.transcription_url
    }
  }
  return null
}

function transcriptText(payload: unknown) {
  const transcripts = (
    payload as { transcripts?: unknown } | null
  )?.transcripts
  if (!Array.isArray(transcripts)) return null
  const text = transcripts
    .flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const value = (item as { text?: unknown }).text
      return typeof value === 'string' ? [value.trim()] : []
    })
    .filter(Boolean)
    .join(' ')
    .trim()
    .slice(0, MAX_TRANSCRIPT_LENGTH)
  return text || null
}

function isUploadedAudio(value: unknown): value is File {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<File>
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.size === 'number' &&
    typeof candidate.arrayBuffer === 'function'
  )
}

async function transcribe(
  audio: File,
  extension: string,
  origin: string,
  apiKey: string,
  model: string,
  dependencies: TranscribeDependencies,
) {
  const commonHeaders = {
    authorization: `Bearer ${apiKey}`,
  }
  const policyResponse = await fetchUpstream(
    dependencies.fetcher,
    `${origin}/api/v1/uploads?action=getPolicy&model=${encodeURIComponent(model)}`,
    {
      method: 'GET',
      headers: commonHeaders,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  )
  const policy = parseUploadPolicy(await safeJson(policyResponse))
  if (!policy) {
    throw new SpeechGatewayError(
      502,
      'TRANSCRIPTION_UNAVAILABLE',
      '语音识别暂时不可用，请重试',
    )
  }

  const objectKey =
    `${policy.uploadDir}/${randomUUID()}.${extension}`
  const upload = new FormData()
  upload.append('OSSAccessKeyId', policy.accessKeyId)
  upload.append('policy', policy.policy)
  upload.append('Signature', policy.signature)
  upload.append('x-oss-object-acl', policy.objectAcl)
  upload.append('x-oss-forbid-overwrite', policy.forbidOverwrite)
  upload.append('key', objectKey)
  upload.append('success_action_status', '200')
  upload.append('file', audio)
  await fetchUpstream(
    dependencies.fetcher,
    policy.uploadHost,
    {
      method: 'POST',
      body: upload,
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  )

  const submitResponse = await fetchUpstream(
    dependencies.fetcher,
    `${origin}/api/v1/services/audio/asr/transcription`,
    {
      method: 'POST',
      headers: {
        ...commonHeaders,
        'content-type': 'application/json',
        'x-dashscope-async': 'enable',
        'x-dashscope-ossresourceresolve': 'enable',
      },
      body: JSON.stringify({
        model,
        input: { file_urls: [`oss://${objectKey}`] },
        parameters: {},
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  )
  const taskId = parseTaskId(await safeJson(submitResponse))
  if (!taskId) {
    throw new SpeechGatewayError(
      502,
      'TRANSCRIPTION_UNAVAILABLE',
      '语音识别暂时不可用，请重试',
    )
  }

  let resultUrl: string | null = null
  for (let attempt = 0; attempt < dependencies.maxPolls; attempt += 1) {
    const pollResponse = await fetchUpstream(
      dependencies.fetcher,
      `${origin}/api/v1/tasks/${taskId}`,
      {
        method: 'GET',
        headers: commonHeaders,
        signal: AbortSignal.timeout(POLL_REQUEST_TIMEOUT_MS),
      },
    )
    const task = parseTask(await safeJson(pollResponse))
    if (!task) {
      throw new SpeechGatewayError(
        502,
        'TRANSCRIPTION_UNAVAILABLE',
        '语音识别暂时不可用，请重试',
      )
    }
    if (task.status === 'SUCCEEDED') {
      resultUrl = transcriptionUrl(task.results)
      if (!resultUrl) {
        throw new SpeechGatewayError(
          502,
          'TRANSCRIPTION_UNAVAILABLE',
          '语音识别暂时不可用，请重试',
        )
      }
      break
    }
    if (task.status === 'FAILED') {
      throw new SpeechGatewayError(
        502,
        'TRANSCRIPTION_UNAVAILABLE',
        '语音识别暂时不可用，请重试',
      )
    }
    if (attempt < dependencies.maxPolls - 1) {
      await dependencies.sleep(dependencies.pollIntervalMs)
    }
  }
  if (!resultUrl) {
    throw new SpeechGatewayError(
      504,
      'TRANSCRIPTION_TIMEOUT',
      '语音识别等待超时，请重试',
    )
  }

  const resultResponse = await fetchUpstream(
    dependencies.fetcher,
    resultUrl,
    {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  )
  const text = transcriptText(await safeJson(resultResponse))
  if (!text) {
    throw new SpeechGatewayError(
      502,
      'TRANSCRIPTION_UNAVAILABLE',
      '语音识别暂时不可用，请重试',
    )
  }
  return text
}

export async function handleDemoTranscribeRequest(
  request: Request,
  environment: TranscribeEnvironment,
  dependencies: TranscribeDependencies = {
    fetcher: fetch,
    sleep: (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
    maxPolls: DEFAULT_MAX_POLLS,
    pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
  },
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
  if (
    !sessionSecret ||
    sessionSecret.length < 16 ||
    !verifyDemoSession(bearerToken(request), sessionSecret)
  ) {
    return demoJsonError(
      401,
      'DEMO_SESSION_REQUIRED',
      '演示会话已失效，请刷新后重试',
      cors,
    )
  }

  const baseUrl =
    environment.HEADLESS_SPEECH_GATEWAY_BASE_URL?.trim() ?? ''
  const apiKey =
    environment.HEADLESS_SPEECH_GATEWAY_API_KEY?.trim() ?? ''
  const model =
    environment.HEADLESS_SPEECH_GATEWAY_MODEL?.trim() ?? ''
  const protocol =
    environment.HEADLESS_SPEECH_GATEWAY_PROTOCOL?.trim() ?? ''
  const origin = dashscopeOrigin(baseUrl)
  if (
    !origin ||
    !apiKey ||
    !model ||
    protocol !== 'dashscope-fun-asr'
  ) {
    return demoJsonError(
      503,
      'SPEECH_NOT_CONFIGURED',
      '语音识别服务暂时不可用',
      cors,
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return demoJsonError(
      400,
      'INVALID_AUDIO',
      '音频请求不完整',
      cors,
    )
  }
  const audio = form.get('audio')
  if (!isUploadedAudio(audio) || audio.size === 0) {
    return demoJsonError(
      400,
      'INVALID_AUDIO',
      '请选择需要识别的音频',
      cors,
    )
  }
  const extension = ALLOWED_MIME_TYPES.get(audio.type.toLowerCase())
  if (!extension) {
    return demoJsonError(
      415,
      'UNSUPPORTED_AUDIO',
      '暂不支持这种音频格式',
      cors,
    )
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return demoJsonError(
      413,
      'AUDIO_TOO_LARGE',
      '音频不能超过 3 MB',
      cors,
    )
  }

  try {
    const text = await transcribe(
      audio,
      extension,
      origin,
      apiKey,
      model,
      dependencies,
    )
    return Response.json({ text }, { headers: cors })
  } catch (error) {
    const safe =
      error instanceof SpeechGatewayError
        ? error
        : new SpeechGatewayError(
            502,
            'TRANSCRIPTION_UNAVAILABLE',
            '语音识别暂时不可用，请重试',
          )
    if (safe.retryAfter) cors.set('retry-after', safe.retryAfter)
    return demoJsonError(
      safe.status,
      safe.code,
      safe.publicMessage,
      cors,
    )
  }
}
