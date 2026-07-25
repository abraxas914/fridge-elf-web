import { describe, expect, it, vi } from 'vitest'
import {
  createManagedSpeech,
  MANAGED_SPEECH_FALLBACK,
  MAX_MANAGED_AUDIO_BYTES,
  type ManagedSpeechDependencies,
} from './managedSpeech'

function mediaStream() {
  const track = { stop: vi.fn() }
  return {
    stream: {
      getTracks: () => [track],
    } as unknown as MediaStream,
    track,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function recorderHarness(options: {
  chunks?: Blob[]
  supported?: string[]
  startError?: Error
} = {}) {
  const instances: Array<{
    mimeType: string
    state: RecordingState
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
    emitChunk(chunk: Blob): void
  }> = []
  const supported = new Set(
    options.supported ?? [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ],
  )

  class FakeMediaRecorder {
    static isTypeSupported(type: string) {
      return supported.has(type)
    }

    readonly mimeType: string
    state: RecordingState = 'inactive'
    ondataavailable: ((event: BlobEvent) => void) | null = null
    onstop: ((event: Event) => void) | null = null
    onerror: ((event: Event) => void) | null = null

    emitChunk(chunk: Blob) {
      this.ondataavailable?.({ data: chunk } as BlobEvent)
    }

    readonly start = vi.fn(() => {
      if (options.startError) throw options.startError
      this.state = 'recording'
    })

    readonly stop = vi.fn(() => {
      if (this.state === 'inactive') return
      this.state = 'inactive'
      queueMicrotask(() => {
        for (const chunk of options.chunks ?? [
          new Blob(['voice'], { type: this.mimeType }),
        ]) {
          this.emitChunk(chunk)
        }
        this.onstop?.(new Event('stop'))
      })
    })

    constructor(
      _stream: MediaStream,
      recorderOptions?: MediaRecorderOptions,
    ) {
      this.mimeType = recorderOptions?.mimeType ?? ''
      instances.push(this)
    }
  }

  return {
    MediaRecorder:
      FakeMediaRecorder as unknown as ManagedSpeechDependencies['MediaRecorder'],
    instances,
  }
}

function timerHarness() {
  let callback: (() => void) | undefined
  const setTimeout = vi.fn((handler: () => void, delay: number) => {
    callback = handler
    return 7
  })
  return {
    setTimeout,
    clearTimeout: vi.fn(),
    fire: () => callback?.(),
  }
}

async function waitForRecorder(
  instances: unknown[],
) {
  await vi.waitFor(() => expect(instances).toHaveLength(1))
}

describe('managed browser speech adapter', () => {
  it('records preferred Opus audio, uploads it, and always cleans up', async () => {
    const { stream, track } = mediaStream()
    const recorder = recorderHarness({
      chunks: [
        new Blob([]),
        new Blob(['real-voice']),
      ],
    })
    const timers = timerHarness()
    const requester = vi.fn(async (audio: Blob) => {
      expect(track.stop).toHaveBeenCalledOnce()
      expect(audio.type).toBe('audio/webm;codecs=opus')
      expect(audio.size).toBeGreaterThan(0)
      return '真实识别文本'
    })
    const speech = createManagedSpeech(requester, {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
      MediaRecorder: recorder.MediaRecorder,
      setTimeout: timers.setTimeout,
      clearTimeout: timers.clearTimeout,
    })

    const session = speech.start()
    expect(session.stop).toEqual(expect.any(Function))
    expect(session.result).toBeInstanceOf(Promise)
    await waitForRecorder(recorder.instances)
    session.stop()

    await expect(session.result).resolves.toBe('真实识别文本')
    expect(requester).toHaveBeenCalledOnce()
    expect(recorder.instances[0]?.mimeType).toBe(
      'audio/webm;codecs=opus',
    )
    expect(recorder.instances[0]?.start).toHaveBeenCalledWith(500)
    expect(timers.setTimeout).toHaveBeenCalledWith(
      expect.any(Function),
      15_000,
    )
    expect(timers.clearTimeout).toHaveBeenCalledWith(7)
    expect(track.stop).toHaveBeenCalledOnce()
  })

  it('honors stop before microphone permission resolves', async () => {
    const pendingStream = deferred<MediaStream>()
    const { stream, track } = mediaStream()
    const recorder = recorderHarness()
    const requester = vi.fn().mockResolvedValue('提前停止也成功')
    const speech = createManagedSpeech(requester, {
      mediaDevices: {
        getUserMedia: vi.fn(() => pendingStream.promise),
      },
      MediaRecorder: recorder.MediaRecorder,
    })

    const session = speech.start()
    session.stop()
    pendingStream.resolve(stream)

    await expect(session.result).resolves.toBe('提前停止也成功')
    expect(recorder.instances[0]?.start).toHaveBeenCalledOnce()
    expect(recorder.instances[0]?.stop).toHaveBeenCalledOnce()
    expect(track.stop).toHaveBeenCalledOnce()
  })

  it('automatically stops recording after 15 seconds', async () => {
    const { stream, track } = mediaStream()
    const recorder = recorderHarness({
      supported: ['audio/ogg;codecs=opus', 'audio/ogg'],
    })
    const timers = timerHarness()
    const requester = vi.fn().mockResolvedValue('自动停止成功')
    const speech = createManagedSpeech(requester, {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
      MediaRecorder: recorder.MediaRecorder,
      setTimeout: timers.setTimeout,
      clearTimeout: timers.clearTimeout,
    })

    const session = speech.start()
    await waitForRecorder(recorder.instances)
    timers.fire()

    await expect(session.result).resolves.toBe('自动停止成功')
    expect(recorder.instances[0]?.mimeType).toBe(
      'audio/ogg;codecs=opus',
    )
    expect(recorder.instances[0]?.stop).toHaveBeenCalledOnce()
    expect(track.stop).toHaveBeenCalledOnce()
  })

  it.each([
    ['unsupported browser', 'unsupported'],
    ['permission denied', 'permission'],
    ['empty recording', 'empty'],
    ['gateway failure', 'network'],
  ])('uses a quiet deterministic fallback for %s', async (_name, mode) => {
    const consoleLog = vi.spyOn(console, 'log')
    const consoleError = vi.spyOn(console, 'error')
    const { stream, track } = mediaStream()
    const recorder = recorderHarness({
      chunks: mode === 'empty' ? [new Blob([])] : undefined,
    })
    const requester = vi.fn(
      mode === 'network'
        ? async () => {
            throw new Error('private gateway detail')
          }
        : async () => 'should-not-be-used',
    )
    const mediaDevices =
      mode === 'unsupported'
        ? undefined
        : {
            getUserMedia:
              mode === 'permission'
                ? vi.fn().mockRejectedValue(
                    new DOMException('denied', 'NotAllowedError'),
                  )
                : vi.fn().mockResolvedValue(stream),
          }
    const speech = createManagedSpeech(requester, {
      mediaDevices,
      MediaRecorder: recorder.MediaRecorder,
    })

    const session = speech.start()
    if (mode === 'empty' || mode === 'network') {
      await waitForRecorder(recorder.instances)
      session.stop()
    }

    await expect(session.result).resolves.toBe(
      MANAGED_SPEECH_FALLBACK,
    )
    if (mode === 'empty') expect(requester).not.toHaveBeenCalled()
    if (mode === 'unsupported' || mode === 'permission') {
      expect(requester).not.toHaveBeenCalled()
    } else {
      expect(track.stop).toHaveBeenCalledOnce()
    }
    expect(consoleLog).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    consoleLog.mockRestore()
    consoleError.mockRestore()
  })

  it('does not upload recordings larger than 3 MB', async () => {
    const { stream, track } = mediaStream()
    const recorder = recorderHarness({
      chunks: [
        new Blob([
          new Uint8Array(MAX_MANAGED_AUDIO_BYTES + 1),
        ]),
      ],
    })
    const requester = vi.fn()
    const speech = createManagedSpeech(requester, {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
      MediaRecorder: recorder.MediaRecorder,
    })

    const session = speech.start()
    await waitForRecorder(recorder.instances)
    session.stop()

    await expect(session.result).resolves.toBe(
      MANAGED_SPEECH_FALLBACK,
    )
    expect(requester).not.toHaveBeenCalled()
    expect(track.stop).toHaveBeenCalledOnce()
  })

  it('stops while recording as soon as chunked audio crosses 3 MB', async () => {
    const { stream, track } = mediaStream()
    const recorder = recorderHarness({ chunks: [] })
    const requester = vi.fn()
    const speech = createManagedSpeech(requester, {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
      MediaRecorder: recorder.MediaRecorder,
    })

    const session = speech.start()
    await waitForRecorder(recorder.instances)
    const instance = recorder.instances[0]!
    instance.emitChunk(
      new Blob([new Uint8Array(2 * 1024 * 1024)]),
    )
    instance.emitChunk(
      new Blob([new Uint8Array(1024 * 1024 + 1)]),
    )
    const stoppedBeforePointerRelease =
      instance.stop.mock.calls.length === 1
    session.stop()

    await expect(session.result).resolves.toBe(
      MANAGED_SPEECH_FALLBACK,
    )
    expect(stoppedBeforePointerRelease).toBe(true)
    expect(instance.stop).toHaveBeenCalledOnce()
    expect(requester).not.toHaveBeenCalled()
    expect(track.stop).toHaveBeenCalledOnce()
  })
})
