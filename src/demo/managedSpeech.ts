import { requestDemoTranscription } from '../ai/demoApi'
import type { SpeechPort } from '../app/ports'

export type DemoSpeechRequester = (audio: Blob) => Promise<string>

type MediaRecorderConstructor = {
  new (
    stream: MediaStream,
    options?: MediaRecorderOptions,
  ): MediaRecorder
  isTypeSupported(type: string): boolean
}

export interface ManagedSpeechDependencies {
  mediaDevices?: Pick<MediaDevices, 'getUserMedia'>
  MediaRecorder?: MediaRecorderConstructor
  setTimeout?: (handler: () => void, delay: number) => unknown
  clearTimeout?: (handle: unknown) => void
}

export const MANAGED_SPEECH_FALLBACK = '买两盒牛奶'
export const MAX_MANAGED_AUDIO_BYTES = 3 * 1024 * 1024

const MAX_RECORDING_MS = 15_000
const PERMISSION_TIMEOUT_MS = 15_000
const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
]

function browserMediaDevices() {
  return typeof navigator === 'undefined'
    ? undefined
    : navigator.mediaDevices
}

function browserMediaRecorder() {
  return typeof MediaRecorder === 'undefined'
    ? undefined
    : MediaRecorder
}

export function createManagedSpeech(
  requester: DemoSpeechRequester = requestDemoTranscription,
  dependencies: ManagedSpeechDependencies = {},
): SpeechPort {
  return {
    start() {
      let recorder: MediaRecorder | null = null
      let stopRequested = false
      let rejectRecording: (() => void) | undefined
      const schedule =
        dependencies.setTimeout ??
        ((handler: () => void, delay: number) =>
          globalThis.setTimeout(handler, delay))
      const cancel =
        dependencies.clearTimeout ??
        ((handle: unknown) =>
          globalThis.clearTimeout(
            handle as ReturnType<typeof globalThis.setTimeout>,
          ))

      const stop = () => {
        stopRequested = true
        if (!recorder || recorder.state === 'inactive') return
        try {
          recorder.stop()
        } catch {
          rejectRecording?.()
        }
      }

      const result = (async () => {
        let stream: MediaStream | undefined
        let permissionTimer: unknown
        let recordingTimer: unknown
        let tracksStopped = false
        const stopStreamTracks = (candidate: MediaStream) => {
          try {
            for (const track of candidate.getTracks()) {
              try {
                track.stop()
              } catch {
                // Best-effort privacy cleanup for a browser-owned track.
              }
            }
          } catch {
            // A partial MediaStream must not reject the speech fallback.
          }
        }
        const stopTracks = () => {
          if (!stream || tracksStopped) return
          tracksStopped = true
          stopStreamTracks(stream)
        }
        try {
          const mediaDevices =
            dependencies.mediaDevices ?? browserMediaDevices()
          const Recorder =
            dependencies.MediaRecorder ?? browserMediaRecorder()
          if (
            !mediaDevices ||
            !Recorder ||
            typeof Recorder.isTypeSupported !== 'function'
          ) {
            return MANAGED_SPEECH_FALLBACK
          }
          const mimeType = PREFERRED_MIME_TYPES.find((candidate) =>
            Recorder.isTypeSupported(candidate),
          )
          if (!mimeType) return MANAGED_SPEECH_FALLBACK

          let permissionExpired = false
          const requestedStream = Promise.resolve().then(() =>
            mediaDevices.getUserMedia({ audio: true }),
          )
          const acquiredStream = requestedStream.then(
            (candidate) => {
              if (permissionExpired) {
                stopStreamTracks(candidate)
                return undefined
              }
              return candidate
            },
            () => undefined,
          )
          const permissionTimeout = new Promise<undefined>((resolve) => {
            permissionTimer = schedule(() => {
              permissionExpired = true
              resolve(undefined)
            }, PERMISSION_TIMEOUT_MS)
          })
          stream = await Promise.race([
            acquiredStream,
            permissionTimeout,
          ])
          if (permissionTimer !== undefined) {
            cancel(permissionTimer)
            permissionTimer = undefined
          }
          if (!stream) return MANAGED_SPEECH_FALLBACK

          const chunks: Blob[] = []
          let recordedBytes = 0
          let overflow = false
          recorder = new Recorder(stream, { mimeType })
          const stopped = new Promise<void>((resolve, reject) => {
            rejectRecording = () => reject(new Error('recording failed'))
            recorder!.ondataavailable = (event) => {
              if (event.data.size === 0 || overflow) return
              recordedBytes += event.data.size
              if (recordedBytes > MAX_MANAGED_AUDIO_BYTES) {
                overflow = true
                stop()
                return
              }
              chunks.push(event.data)
            }
            recorder!.onstop = () => resolve()
            recorder!.onerror = () =>
              reject(new Error('recording failed'))
          })
          recorder.start(500)
          recordingTimer = schedule(stop, MAX_RECORDING_MS)
          if (stopRequested) stop()
          await stopped
          stopTracks()

          if (overflow) return MANAGED_SPEECH_FALLBACK

          const audio = new Blob(chunks, {
            type: recorder.mimeType || mimeType,
          })
          if (
            audio.size === 0 ||
            audio.size > MAX_MANAGED_AUDIO_BYTES
          ) {
            return MANAGED_SPEECH_FALLBACK
          }
          const text = await requester(audio)
          return typeof text === 'string' && text.trim()
            ? text
            : MANAGED_SPEECH_FALLBACK
        } catch {
          return MANAGED_SPEECH_FALLBACK
        } finally {
          if (permissionTimer !== undefined) cancel(permissionTimer)
          if (recordingTimer !== undefined) cancel(recordingTimer)
          stopTracks()
        }
      })()

      return { stop, result }
    },
  }
}
