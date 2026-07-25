import { describe, expect, it, vi } from 'vitest'
import { issueDemoSession } from '../_lib/demoSession'
import type { TranscribeDependencies } from '../_lib/transcribe'
import {
  MAX_TRANSCRIBE_REQUEST_BYTES,
  bridgeNodeRequestAbort,
  handleTranscribeNodeRequest,
  readLimitedRequestBody,
} from './transcribe'

const environment = {
  DEMO_SESSION_SECRET: 'demo-session-secret-for-tests',
  HEADLESS_SPEECH_GATEWAY_BASE_URL:
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
  HEADLESS_SPEECH_GATEWAY_API_KEY: 'server-only-speech-key',
  HEADLESS_SPEECH_GATEWAY_MODEL: 'fun-asr',
  HEADLESS_SPEECH_GATEWAY_PROTOCOL: 'dashscope-fun-asr',
}

function sessionAuthorization() {
  return `Bearer ${issueDemoSession(
    environment.DEMO_SESSION_SECRET,
    Date.now(),
  ).token}`
}

function streamedRequest(
  chunks: Uint8Array[],
  headers: Record<string, string> = {},
) {
  let consumed = 0
  return {
    request: {
      method: 'POST',
      headers: {
        origin: 'https://fridge-elf-app.vercel.app',
        authorization: sessionAuthorization(),
        'content-type':
          'multipart/form-data; boundary=fridge-elf-test',
        ...headers,
      },
      url: '/api/demo/transcribe',
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) {
          consumed += 1
          yield chunk
        }
      },
    },
    consumed: () => consumed,
  }
}

function coreDependencies(
  fetcher: TranscribeDependencies['fetcher'],
): TranscribeDependencies {
  return {
    fetcher,
    sleep: vi.fn(async () => undefined),
    maxPolls: 2,
    pollIntervalMs: 2_000,
    now: Date.now,
    totalTimeoutMs: 120_000,
  }
}

function eventedMultipartRequest() {
  const boundary = 'fridge-elf-node-boundary'
  const listeners = new Map<string, Set<() => void>>()
  const request = {
    method: 'POST',
    headers: {
      origin: 'https://fridge-elf-app.vercel.app',
      authorization: sessionAuthorization(),
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    url: '/api/demo/transcribe',
    body: Buffer.from([
      `--${boundary}`,
      'Content-Disposition: form-data; name="audio"; filename="voice.webm"',
      'Content-Type: audio/webm',
      '',
      'voice',
      `--${boundary}--`,
      '',
    ].join('\r\n')),
    complete: true,
    aborted: false,
    destroyed: false,
    on(event: string, listener: () => void) {
      const handlers = listeners.get(event) ?? new Set()
      handlers.add(listener)
      listeners.set(event, handlers)
      return request
    },
    off(event: string, listener: () => void) {
      listeners.get(event)?.delete(listener)
      return request
    },
    emit(event: string) {
      for (const listener of listeners.get(event) ?? []) listener()
    },
  }
  return request
}

describe('Demo transcription Node request boundary', () => {
  it('bounds buffered and string bodies by their encoded byte length', async () => {
    await expect(readLimitedRequestBody({
      headers: {},
      body: Buffer.alloc(MAX_TRANSCRIBE_REQUEST_BYTES),
    })).resolves.toHaveLength(MAX_TRANSCRIBE_REQUEST_BYTES)
    await expect(readLimitedRequestBody({
      headers: {},
      body: Buffer.alloc(MAX_TRANSCRIBE_REQUEST_BYTES + 1),
    })).rejects.toMatchObject({ code: 'REQUEST_BODY_TOO_LARGE' })
    await expect(readLimitedRequestBody({
      headers: {},
      body: '界'.repeat(
        Math.floor(MAX_TRANSCRIBE_REQUEST_BYTES / 3) + 1,
      ),
    })).rejects.toMatchObject({ code: 'REQUEST_BODY_TOO_LARGE' })
  })

  it('rejects an oversized Content-Length before consuming the stream', async () => {
    const streamed = streamedRequest(
      [new Uint8Array([1, 2, 3])],
      {
        'content-length':
          String(MAX_TRANSCRIBE_REQUEST_BYTES + 1),
      },
    )

    const response = await handleTranscribeNodeRequest(
      streamed.request,
      environment,
    )

    expect(response.status).toBe(413)
    expect(streamed.consumed()).toBe(0)
  })

  it('stops consuming a chunked stream as soon as it crosses the limit', async () => {
    const streamed = streamedRequest([
      new Uint8Array(MAX_TRANSCRIBE_REQUEST_BYTES),
      new Uint8Array([1]),
      new Uint8Array([2]),
    ])

    const response = await handleTranscribeNodeRequest(
      streamed.request,
      environment,
    )

    expect(response.status).toBe(413)
    expect(streamed.consumed()).toBe(2)
  })

  it('rejects an unauthorized request without consuming its stream', async () => {
    const streamed = streamedRequest(
      [new Uint8Array([1, 2, 3])],
      { authorization: '' },
    )

    const response = await handleTranscribeNodeRequest(
      streamed.request,
      environment,
    )

    expect(response.status).toBe(401)
    expect(streamed.consumed()).toBe(0)
  })

  it('times out a hanging raw body after an absolute 15 seconds', async () => {
    let timeout: (() => void) | undefined
    const setTimeout = vi.fn((handler: () => void) => {
      timeout = handler
      return 17
    })
    const clearTimeout = vi.fn()
    const request = {
      method: 'POST',
      headers: {
        origin: 'https://fridge-elf-app.vercel.app',
        authorization: sessionAuthorization(),
        'content-type':
          'multipart/form-data; boundary=fridge-elf-test',
      },
      url: '/api/demo/transcribe',
      [Symbol.asyncIterator]() {
        return {
          next: () => new Promise<IteratorResult<Uint8Array>>(
            () => undefined,
          ),
        }
      },
    }

    const pending = handleTranscribeNodeRequest(
      request,
      environment,
      { setTimeout, clearTimeout },
    )
    await Promise.resolve()
    expect(setTimeout).toHaveBeenCalledWith(
      expect.any(Function),
      15_000,
    )
    timeout?.()

    const response = await pending
    expect(response.status).toBe(408)
    expect(await response.json()).toEqual({
      error: {
        code: 'REQUEST_TIMEOUT',
        message: '音频上传超时，请重试',
      },
    })
    expect(clearTimeout).toHaveBeenCalledWith(17)
  })

  it('rejects a pre-aborted request without consuming its body', async () => {
    let consumed = 0
    const fetcher = vi.fn()
    const response = await handleTranscribeNodeRequest(
      {
        method: 'POST',
        headers: {
          origin: 'https://fridge-elf-app.vercel.app',
          authorization: sessionAuthorization(),
          'content-type':
            'multipart/form-data; boundary=fridge-elf-test',
        },
        url: '/api/demo/transcribe',
        aborted: true,
        async *[Symbol.asyncIterator]() {
          consumed += 1
          yield new Uint8Array([1])
        },
      },
      environment,
      {
        transcribeDependencies: coreDependencies(fetcher),
      },
    )

    expect(response.status).toBe(408)
    expect(consumed).toBe(0)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('propagates a client abort into an upstream response body read', async () => {
    const request = eventedMultipartRequest()
    const cancel = vi.fn()
    const observed: { signal?: AbortSignal } = {}
    const fetcher = vi.fn(async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
      observed.signal = init?.signal ?? undefined
      return new Response(new ReadableStream({
        pull: () => new Promise(() => undefined),
        cancel,
      }))
    })

    const pending = handleTranscribeNodeRequest(
      request,
      environment,
      {
        transcribeDependencies: coreDependencies(fetcher),
      },
    )
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce())
    request.aborted = true
    request.destroyed = true
    request.complete = false
    request.emit('aborted')
    expect(observed.signal).toBeDefined()
    expect(observed.signal?.aborted).toBe(true)

    const response = await pending
    expect(response.status).toBe(502)
    expect(observed.signal?.aborted).toBe(true)
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('does not treat a normal completed request close as an abort', () => {
    const request = eventedMultipartRequest()
    request.destroyed = true
    request.complete = true
    const bridge = bridgeNodeRequestAbort(request)

    request.emit('close')

    expect(bridge.signal.aborted).toBe(false)
    bridge.cleanup()
  })
})
