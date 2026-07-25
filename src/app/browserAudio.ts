import type { AudioCue, AudioPort } from './ports'

interface AudioParamLike {
  setValueAtTime(value: number, startTime: number): void
  exponentialRampToValueAtTime(value: number, endTime: number): void
}

interface OscillatorLike {
  type: OscillatorType
  frequency: AudioParamLike
  connect(destination: unknown): void
  start(when: number): void
  stop(when: number): void
}

interface GainLike {
  gain: AudioParamLike
  connect(destination: unknown): void
}

export interface AudioContextLike {
  currentTime: number
  state: string
  destination: unknown
  createOscillator(): OscillatorLike
  createGain(): GainLike
  resume(): Promise<void> | void
  close?(): Promise<void> | void
}

interface BrowserAudioOptions {
  eventTarget?: Pick<Document, 'addEventListener' | 'removeEventListener'>
  createContext?: () => AudioContextLike | null
  schedule?: (callback: () => void, delayMs: number) => number
}

type CueStep = readonly [
  delayMs: number,
  frequency: number,
  duration: number,
  gain?: number,
]

const CUES: Record<AudioCue, readonly CueStep[]> = {
  ding: [[0, 880, 0.08], [60, 1320, 0.14]],
  boop: [[0, 660, 0.05], [55, 880, 0.08]],
  tick: [[0, 1400, 0.02, 0.04]],
  success: [[0, 660, 0.05], [50, 880, 0.05], [100, 1100, 0.1]],
  error: [[0, 330, 0.09], [80, 220, 0.14]],
  wake: [[0, 523, 0.06], [60, 659, 0.06], [120, 784, 0.1]],
}

function defaultContextFactory(): AudioContextLike | null {
  const hostWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext
  }
  const Context =
    typeof AudioContext === 'undefined'
      ? hostWindow.webkitAudioContext
      : AudioContext
  if (!Context) return null
  try {
    return new Context()
  } catch {
    return null
  }
}

export interface BrowserAudio extends AudioPort {
  unlock(): void
  destroy(): void
}

export function createBrowserAudio(
  options: BrowserAudioOptions = {},
): BrowserAudio {
  const eventTarget =
    options.eventTarget ?? (typeof document === 'undefined' ? undefined : document)
  const createContext = options.createContext ?? defaultContextFactory
  const schedule =
    options.schedule ??
    ((callback, delayMs) => window.setTimeout(callback, delayMs))
  let context: AudioContextLike | null = null
  let muted = false
  let unlocked = false

  const unlock = () => {
    unlocked = true
    if (context?.state === 'suspended') void context.resume()
  }

  const gestureListener: EventListener = () => unlock()
  eventTarget?.addEventListener('pointerdown', gestureListener, {
    capture: true,
    once: true,
  })
  eventTarget?.addEventListener('keydown', gestureListener, {
    capture: true,
    once: true,
  })

  const ensureContext = () => {
    if (!context) context = createContext()
    if (context?.state === 'suspended') void context.resume()
    return context
  }

  const beep = (
    frequency: number,
    duration: number,
    gainValue = 0.08,
  ) => {
    if (muted || !unlocked) return
    const audioContext = ensureContext()
    if (!audioContext) return
    const start = audioContext.currentTime
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(gainValue, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(start)
    oscillator.stop(start + duration)
  }

  return {
    unlock,
    play(cue) {
      for (const [delayMs, frequency, duration, gain] of CUES[cue]) {
        if (delayMs === 0) beep(frequency, duration, gain)
        else schedule(() => beep(frequency, duration, gain), delayMs)
      }
    },
    setMuted(nextMuted) {
      muted = nextMuted
    },
    destroy() {
      eventTarget?.removeEventListener('pointerdown', gestureListener, true)
      eventTarget?.removeEventListener('keydown', gestureListener, true)
      if (context?.close) void context.close()
      context = null
    },
  }
}
