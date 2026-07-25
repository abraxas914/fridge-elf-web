import { describe, expect, it } from 'vitest'
import { issueDemoSession } from '../_lib/demoSession'
import {
  MAX_TRANSCRIBE_REQUEST_BYTES,
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
})
