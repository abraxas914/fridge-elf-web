import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createBrowserAudio,
  type AudioContextLike,
} from './browserAudio'
import type { AudioCue } from './ports'

function fakeContext() {
  const tones: { frequency: number; duration: number; gain: number; type: string }[] = []
  let pending:
    | { frequency: number; gain: number; started: number; type: string }
    | undefined
  const context: AudioContextLike = {
    currentTime: 10,
    state: 'running',
    destination: {},
    createOscillator() {
      pending = { frequency: 0, gain: 0, started: 0, type: '' }
      return {
        type: 'sine',
        frequency: {
          setValueAtTime(value) {
            if (pending) pending.frequency = value
          },
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        start(when) {
          if (pending) pending.started = when
        },
        stop(when) {
          if (!pending) return
          tones.push({
            frequency: pending.frequency,
            duration: when - pending.started,
            gain: pending.gain,
            type: pending.type,
          })
        },
      }
    },
    createGain() {
      return {
        gain: {
          setValueAtTime(value) {
            if (pending) pending.gain = value
          },
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      }
    },
    resume() {},
  }
  const originalCreateOscillator = context.createOscillator
  context.createOscillator = () => {
    const oscillator = originalCreateOscillator()
    Object.defineProperty(oscillator, 'type', {
      get: () => pending?.type ?? '',
      set: (value: string) => {
        if (pending) pending.type = value
      },
    })
    return oscillator
  }
  return { context, tones }
}

describe('browser audio', () => {
  afterEach(() => vi.useRealTimers())

  it('does not create an AudioContext before a user gesture', () => {
    const factory = vi.fn(() => fakeContext().context)
    const audio = createBrowserAudio({ createContext: factory })

    audio.play('ding')
    expect(factory).not.toHaveBeenCalled()
    document.dispatchEvent(new Event('pointerdown'))
    audio.play('tick')
    expect(factory).toHaveBeenCalledOnce()
    audio.destroy()
  })

  it('mutes every immediate and delayed tone', () => {
    vi.useFakeTimers()
    const { context, tones } = fakeContext()
    const audio = createBrowserAudio({ createContext: () => context })
    audio.unlock()
    audio.setMuted(true)
    audio.play('wake')
    vi.runAllTimers()
    expect(tones).toEqual([])

    audio.setMuted(false)
    audio.play('tick')
    expect(tones).toHaveLength(1)
    audio.destroy()
  })

  it('ports all six square-wave cue sequences exactly', () => {
    vi.useFakeTimers()
    const expected: Record<AudioCue, number[]> = {
      ding: [880, 1320],
      boop: [660, 880],
      tick: [1400],
      success: [660, 880, 1100],
      error: [330, 220],
      wake: [523, 659, 784],
    }

    for (const [cue, frequencies] of Object.entries(expected) as [
      AudioCue,
      number[],
    ][]) {
      const { context, tones } = fakeContext()
      const audio = createBrowserAudio({ createContext: () => context })
      audio.unlock()
      audio.play(cue)
      vi.runAllTimers()
      expect(tones.map((tone) => tone.frequency)).toEqual(frequencies)
      expect(tones.every((tone) => tone.type === 'square')).toBe(true)
      audio.destroy()
    }
  })
})
