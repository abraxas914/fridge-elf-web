import { describe, expect, it, vi } from 'vitest'
import {
  handleDemoTranscribeRequest,
  type TranscribeDependencies,
} from './_lib/transcribe'
import { issueDemoSession } from './_lib/demoSession'

const environment = {
  DEMO_SESSION_SECRET: 'demo-session-secret-for-tests',
  HEADLESS_SPEECH_GATEWAY_BASE_URL:
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
  HEADLESS_SPEECH_GATEWAY_API_KEY: 'server-only-speech-key',
  HEADLESS_SPEECH_GATEWAY_MODEL: 'fun-asr',
  HEADLESS_SPEECH_GATEWAY_PROTOCOL: 'dashscope-fun-asr',
}

const origin = 'https://fridge-elf-app.vercel.app'

function request(
  audio: {
    contents: string
    name: string
    type: string
  } | null = {
    contents: 'sensitive-audio-bytes',
    name: 'voice.webm',
    type: 'audio/webm',
  },
  options: {
    authorization?: string
    method?: string
    origin?: string
    signal?: AbortSignal
  } = {},
) {
  const method = options.method ?? 'POST'
  const token = issueDemoSession(
    environment.DEMO_SESSION_SECRET,
    Date.now(),
  ).token
  const boundary = '----fridge-elf-test-boundary'
  const body = audio
    ? [
        `--${boundary}`,
        `Content-Disposition: form-data; name="audio"; filename="${audio.name}"`,
        `Content-Type: ${audio.type}`,
        '',
        audio.contents,
        `--${boundary}--`,
        '',
      ].join('\r\n')
    : [`--${boundary}--`, ''].join('\r\n')
  return new Request(`${origin}/api/demo/transcribe`, {
    method,
    headers: {
      authorization:
        options.authorization ?? `Bearer ${token}`,
      'content-type': `multipart/form-data; boundary=${boundary}`,
      origin: options.origin ?? origin,
    },
    body: method === 'POST' ? body : undefined,
    signal: options.signal,
  })
}

function dependencies(
  fetcher: TranscribeDependencies['fetcher'],
  overrides: Partial<TranscribeDependencies> = {},
): TranscribeDependencies {
  return {
    fetcher,
    sleep: vi.fn(async () => undefined),
    maxPolls: 4,
    pollIntervalMs: 2_000,
    now: Date.now,
    totalTimeoutMs: 120_000,
    ...overrides,
  }
}

function policyResponse(uploadHost =
  'https://dashscope-file-cn.oss-cn-beijing.aliyuncs.com') {
  return Response.json({
    data: {
      oss_access_key_id: 'temporary-access-id',
      policy: 'temporary-policy',
      signature: 'temporary-signature',
      upload_dir: 'dashscope-instant/session',
      upload_host: uploadHost,
      x_oss_object_acl: 'private',
      x_oss_forbid_overwrite: 'true',
    },
  })
}

function taskResponse(
  taskStatus: string,
  extra: Record<string, unknown> = {},
) {
  return Response.json({
    output: {
      task_id: 'task-safe-123',
      task_status: taskStatus,
      ...extra,
    },
  })
}

describe('anonymous Demo speech transcription BFF', () => {
  it('requires POST and the signed anonymous session before upstream IO', async () => {
    const fetcher = vi.fn()
    const unauthorized = await handleDemoTranscribeRequest(
      request(undefined, { authorization: '' }),
      environment,
      dependencies(fetcher),
    )
    const wrongMethod = await handleDemoTranscribeRequest(
      request(null, { method: 'GET' }),
      environment,
      dependencies(fetcher),
    )

    expect(unauthorized.status).toBe(401)
    expect(wrongMethod.status).toBe(405)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('accepts only the allowlisted audio MIME types up to 3 MB', async () => {
    const fetcher = vi.fn()
    const invalidMime = await handleDemoTranscribeRequest(
      request({
        contents: 'voice',
        name: 'voice.txt',
        type: 'text/plain',
      }),
      environment,
      dependencies(fetcher),
    )
    const oversizedRequest = request({
      contents: 'x'.repeat(3 * 1024 * 1024 + 1),
      name: 'voice.wav',
      type: 'audio/wav',
    })
    const oversized = await handleDemoTranscribeRequest(
      oversizedRequest,
      environment,
      dependencies(fetcher),
    )

    expect(invalidMime.status).toBe(415)
    expect(oversized.status).toBe(413)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it.each([
    ['audio/webm;codecs=opus', 'voice.webm'],
    ['audio/ogg; codecs=opus', 'voice.ogg'],
  ])('accepts browser codec parameters in %s', async (type, name) => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(null, { status: 429 }),
    )

    const response = await handleDemoTranscribeRequest(
      request({ contents: 'voice', name, type }),
      environment,
      dependencies(fetcher),
    )

    expect(response.status).toBe(429)
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('uploads last, submits fun-asr, polls, and returns bounded transcript text', async () => {
    const fetcher = vi.fn(async (
      input: string | URL | Request,
      _init?: RequestInit,
    ) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url
      if (url.includes('/uploads?')) return policyResponse()
      if (url.includes('dashscope-file-cn.oss-cn-beijing')) {
        return new Response(null, { status: 200 })
      }
      if (url.endsWith('/services/audio/asr/transcription')) {
        return taskResponse('PENDING')
      }
      if (url.endsWith('/tasks/task-safe-123')) {
        const pollCount = fetcher.mock.calls.filter(([value]) =>
          String(value).includes('/tasks/task-safe-123'),
        ).length
        return pollCount === 1
          ? taskResponse('RUNNING')
          : taskResponse('SUCCEEDED', {
              results: [{
                subtask_status: 'SUCCEEDED',
                transcription_url:
                  'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/result.json',
              }],
            })
      }
      if (url.includes('dashscope-result-bj.oss-cn-beijing')) {
        return Response.json({
          transcripts: [
            { text: ' 今晚先做番茄炒蛋。 ' },
            { text: '牛奶记得冷藏。' },
            { text: '长'.repeat(2_100) },
          ],
        })
      }
      throw new Error(`unexpected URL: ${url}`)
    })
    const deps = dependencies(fetcher)

    const response = await handleDemoTranscribeRequest(
      request(),
      environment,
      deps,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const payload = await response.json() as { text: string }
    expect(payload.text).toMatch(
      /^今晚先做番茄炒蛋。 牛奶记得冷藏。 长+/,
    )
    expect(payload.text).toHaveLength(2_000)

    const [policyUrl, policyInit] = fetcher.mock.calls[0]
    expect(policyUrl).toBe(
      'https://dashscope.aliyuncs.com/api/v1/uploads?action=getPolicy&model=fun-asr',
    )
    expect(
      new Headers(policyInit?.headers).get('authorization'),
    ).toBe('Bearer server-only-speech-key')

    const [, uploadInit] = fetcher.mock.calls[1]
    expect(uploadInit?.body).toBeInstanceOf(FormData)
    const uploadEntries: Array<[string, FormDataEntryValue]> = []
    ;(uploadInit?.body as FormData).forEach((value, key) => {
      uploadEntries.push([key, value])
    })
    expect(uploadEntries.at(-1)?.[0]).toBe('file')
    expect(uploadEntries).toEqual(
      expect.arrayContaining([
        ['OSSAccessKeyId', 'temporary-access-id'],
        ['policy', 'temporary-policy'],
        ['Signature', 'temporary-signature'],
        ['x-oss-object-acl', 'private'],
        ['x-oss-forbid-overwrite', 'true'],
        ['success_action_status', '200'],
      ]),
    )

    const [submitUrl, submitInit] = fetcher.mock.calls[2]
    expect(submitUrl).toBe(
      'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
    )
    const submitHeaders = new Headers(submitInit?.headers)
    expect(submitHeaders.get('x-dashscope-async')).toBe('enable')
    expect(
      submitHeaders.get('x-dashscope-ossresourceresolve'),
    ).toBe('enable')
    expect(JSON.parse(String(submitInit?.body))).toEqual({
      model: 'fun-asr',
      input: {
        file_urls: [
          expect.stringMatching(
            /^oss:\/\/dashscope-instant\/session\/[A-Za-z0-9-]+\.webm$/,
          ),
        ],
      },
      parameters: {},
    })
    expect(deps.sleep).toHaveBeenCalledWith(2_000)
    for (const [, init] of fetcher.mock.calls) {
      expect(init?.redirect).toBe('error')
    }
  })

  it('refuses an upstream redirect before bearer credentials can leave DashScope', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'https://attacker.example/steal' },
      }),
    )

    const response = await handleDemoTranscribeRequest(
      request(),
      environment,
      dependencies(fetcher),
    )

    expect(response.status).toBe(502)
    expect(fetcher).toHaveBeenCalledOnce()
    const [, init] = fetcher.mock.calls[0]
    expect(init?.redirect).toBe('error')
    expect(new Headers(init?.headers).get('authorization')).toBe(
      'Bearer server-only-speech-key',
    )
    expect(JSON.stringify(await response.json())).not.toContain(
      'attacker.example',
    )
  })

  it('cancels an upstream JSON stream as soon as it exceeds 200 KB', async () => {
    let produced = 0
    const cancel = vi.fn()
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        produced += 1
        controller.enqueue(new Uint8Array(100_001))
        if (produced === 4) controller.close()
      },
      cancel,
    })
    const fetcher = vi.fn().mockResolvedValue(
      new Response(body, {
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await handleDemoTranscribeRequest(
      request(),
      environment,
      dependencies(fetcher),
    )

    expect(response.status).toBe(502)
    expect(cancel).toHaveBeenCalledOnce()
    expect(produced).toBeLessThan(4)
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('treats an empty upstream body as a clean unavailable response', async () => {
    const response = await handleDemoTranscribeRequest(
      request(),
      environment,
      dependencies(
        vi.fn().mockResolvedValue(new Response(null)),
      ),
    )

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      error: {
        code: 'TRANSCRIPTION_UNAVAILABLE',
        message: '语音识别暂时不可用，请重试',
      },
    })
  })

  it('preserves sanitized throttling without exposing upstream content', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json(
        {
          apiKey: environment.HEADLESS_SPEECH_GATEWAY_API_KEY,
          upstream: 'raw-error',
        },
        {
          status: 429,
          headers: { 'retry-after': '37' },
        },
      ),
    )

    const response = await handleDemoTranscribeRequest(
      request(),
      environment,
      dependencies(fetcher),
    )
    const serialized = JSON.stringify(await response.json())

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('37')
    expect(serialized).not.toContain('raw-error')
    expect(serialized).not.toContain('server-only-speech-key')
    expect(serialized).not.toContain('sensitive-audio')
  })

  it('rejects malicious upload and transcription URLs before fetching them', async () => {
    const badUploadFetcher = vi.fn().mockResolvedValue(
      policyResponse('https://attacker.example/upload'),
    )
    const badUpload = await handleDemoTranscribeRequest(
      request(),
      environment,
      dependencies(badUploadFetcher),
    )

    const badResultFetcher = vi.fn()
      .mockResolvedValueOnce(policyResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(taskResponse('PENDING'))
      .mockResolvedValueOnce(
        taskResponse('SUCCEEDED', {
          results: [{
            subtask_status: 'SUCCEEDED',
            transcription_url: 'https://attacker.example/private',
          }],
        }),
      )
    const badResult = await handleDemoTranscribeRequest(
      request(),
      environment,
      dependencies(badResultFetcher),
    )

    expect(badUpload.status).toBe(502)
    expect(badUploadFetcher).toHaveBeenCalledOnce()
    expect(badResult.status).toBe(502)
    expect(badResultFetcher).toHaveBeenCalledTimes(4)
  })

  it('returns a clean timeout when polling never reaches a terminal state', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(policyResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(taskResponse('PENDING'))
      .mockImplementation(async () => taskResponse('RUNNING'))
    const deps = dependencies(fetcher, { maxPolls: 2 })

    const response = await handleDemoTranscribeRequest(
      request(),
      environment,
      deps,
    )

    expect(response.status).toBe(504)
    expect(await response.json()).toEqual({
      error: {
        code: 'TRANSCRIPTION_TIMEOUT',
        message: '语音识别等待超时，请重试',
      },
    })
    expect(deps.sleep).toHaveBeenCalledTimes(1)
  })

  it('enforces one deadline across upload, submission, polling, and results', async () => {
    let now = 1_000
    const fetcher = vi.fn()
      .mockResolvedValueOnce(policyResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(taskResponse('PENDING'))
      .mockImplementation(async () => taskResponse('RUNNING'))
    const sleep = vi.fn(async (milliseconds: number) => {
      now += milliseconds
    })
    const deps = dependencies(fetcher, {
      maxPolls: 100,
      pollIntervalMs: 2_000,
      totalTimeoutMs: 5_000,
      now: () => now,
      sleep,
    })

    const response = await handleDemoTranscribeRequest(
      request(),
      environment,
      deps,
    )

    expect(response.status).toBe(504)
    expect(await response.json()).toEqual({
      error: {
        code: 'TRANSCRIPTION_TIMEOUT',
        message: '语音识别等待超时，请重试',
      },
    })
    expect(sleep).toHaveBeenNthCalledWith(1, 2_000)
    expect(sleep).toHaveBeenNthCalledWith(2, 2_000)
    expect(sleep).toHaveBeenNthCalledWith(3, 1_000)
    expect(fetcher).toHaveBeenCalledTimes(6)
    for (const [, init] of fetcher.mock.calls) {
      expect(init?.signal).toBeInstanceOf(AbortSignal)
    }
  })

  it('reports 504 when reading the final result exhausts the deadline', async () => {
    let now = 1_000
    const fetcher = vi.fn()
      .mockResolvedValueOnce(policyResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(taskResponse('PENDING'))
      .mockResolvedValueOnce(
        taskResponse('SUCCEEDED', {
          results: [{
            subtask_status: 'SUCCEEDED',
            transcription_url:
              'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/result.json',
          }],
        }),
      )
      .mockImplementationOnce(async () => {
        const body = JSON.stringify({
          transcripts: [{ text: 'deadline result' }],
        })
        return new Response(new ReadableStream({
          start(controller) {
            now = 6_000
            controller.enqueue(new TextEncoder().encode(body))
            controller.close()
          },
        }))
      })

    const response = await handleDemoTranscribeRequest(
      request(),
      environment,
      dependencies(fetcher, {
        now: () => now,
        totalTimeoutMs: 5_000,
      }),
    )

    expect(response.status).toBe(504)
    expect(await response.json()).toEqual({
      error: {
        code: 'TRANSCRIPTION_TIMEOUT',
        message: '语音识别等待超时，请重试',
      },
    })
  })

  it('cleans generic upstream failures and missing server configuration', async () => {
    const upstreamFailure = await handleDemoTranscribeRequest(
      request(),
      environment,
      dependencies(
        vi.fn().mockResolvedValue(
          Response.json(
            { detail: 'upstream-secret-detail' },
            { status: 500 },
          ),
        ),
      ),
    )
    const missingEnvironment = await handleDemoTranscribeRequest(
      request(),
      {
        DEMO_SESSION_SECRET: environment.DEMO_SESSION_SECRET,
      },
      dependencies(vi.fn()),
    )

    expect(upstreamFailure.status).toBe(502)
    expect(JSON.stringify(await upstreamFailure.json()))
      .not.toContain('upstream-secret-detail')
    expect(missingEnvironment.status).toBe(503)
    expect(await missingEnvironment.json()).toEqual({
      error: {
        code: 'SPEECH_NOT_CONFIGURED',
        message: '语音识别服务暂时不可用',
      },
    })
  })
})
