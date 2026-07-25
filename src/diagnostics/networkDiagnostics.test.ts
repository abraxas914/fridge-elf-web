import { describe, expect, it, vi } from 'vitest'
import {
  beginNetworkRequest,
  createNetworkDiagnosticsStore,
  createTimeoutSignal,
  isNetworkDiagnosticsEnabled,
  safeNetworkTarget,
  type NetworkDiagnosticEvent,
} from './networkDiagnostics'

function diagnosticEvent(
  requestId: string,
): NetworkDiagnosticEvent {
  return {
    requestId,
    operation: 'agent',
    stage: 'failure',
    target: 'https://example.test/api/demo/agent',
    timestamp: '2026-07-26T00:00:00.000Z',
    status: 429,
    code: 'DEMO_RATE_LIMITED',
    durationMs: 321,
  }
}

describe('network diagnostics core', () => {
  it('enables diagnostics only for the explicit network debug query', () => {
    expect(isNetworkDiagnosticsEnabled('?debug=network')).toBe(true)
    expect(
      isNetworkDiagnosticsEnabled('?foo=1&debug=network&bar=2'),
    ).toBe(true)
    expect(isNetworkDiagnosticsEnabled('?debug=other')).toBe(false)
    expect(isNetworkDiagnosticsEnabled('')).toBe(false)
  })

  it('keeps only bounded safe request events', () => {
    const store = createNetworkDiagnosticsStore({
      enabled: () => true,
      maxEvents: 2,
    })

    store.record(diagnosticEvent('request-one'))
    store.record(diagnosticEvent('request-two'))
    store.record(diagnosticEvent('request-three'))

    expect(
      store.getSnapshot().events.map((event) => event.requestId),
    ).toEqual(['request-two', 'request-three'])
  })

  it('does not record events while diagnostics are disabled', () => {
    const store = createNetworkDiagnosticsStore({
      enabled: () => false,
    })

    store.record(diagnosticEvent('request-hidden'))

    expect(store.getSnapshot().events).toEqual([])
  })

  it('serializes a redacted report without queries or secrets', () => {
    window.history.replaceState(
      {},
      '',
      '/demo?debug=network&token=Bearer-secret',
    )
    const store = createNetworkDiagnosticsStore({
      enabled: () => true,
    })
    store.record(diagnosticEvent('request-report'))

    const report = store.report()

    expect(report).toContain('"pathname": "/demo"')
    expect(report).toContain('"requestId": "request-report"')
    expect(report).not.toContain('Bearer-secret')
    expect(report).not.toContain('authorization')
    expect(report).not.toContain('"search"')
  })

  it('removes query strings from diagnostic targets', () => {
    expect(
      safeNetworkTarget(
        'https://example.test/api/demo/agent?token=secret#fragment',
      ),
    ).toBe('https://example.test/api/demo/agent')
    expect(safeNetworkTarget('/api/demo/session?secret=1')).toBe(
      `${window.location.origin}/api/demo/session`,
    )
  })

  it('records a request lifecycle under one generated request ID', () => {
    const store = createNetworkDiagnosticsStore({
      enabled: () => true,
    })
    const trace = beginNetworkRequest(
      'agent',
      'https://example.test/api/demo/agent?secret=1',
      store,
      () => 1_000,
    )

    trace.response(429)
    trace.failure('DEMO_RATE_LIMITED', 429)

    const events = store.getSnapshot().events
    expect(trace.requestId).toMatch(/^[A-Za-z0-9_-]{8,80}$/)
    expect(events.map((event) => event.stage)).toEqual([
      'start',
      'response',
      'failure',
    ])
    expect(new Set(events.map((event) => event.requestId)).size).toBe(1)
    expect(events.every((event) => !event.target.includes('?'))).toBe(
      true,
    )
  })

  it('records only safe Context V2 budget metadata', () => {
    const store = createNetworkDiagnosticsStore({
      enabled: () => true,
    })
    const trace = beginNetworkRequest(
      'agent',
      'https://example.test/api/demo/agent',
      store,
      () => 1_000,
    )

    trace.context({
      contextVersion: 2,
      serializedBytes: 7_842,
      inventoryCount: 18,
      plannedMealCount: 2,
      missingItemCount: 1,
      recipeCount: 5,
      truncated: false,
      omittedCount: 0,
    })

    expect(store.getSnapshot().events[1]).toMatchObject({
      stage: 'context',
      contextMeta: {
        contextVersion: 2,
        serializedBytes: 7_842,
        inventoryCount: 18,
        recipeCount: 5,
        truncated: false,
      },
    })
    expect(store.report()).not.toContain('番茄')
  })

  it('aborts through AbortController without AbortSignal.timeout', async () => {
    vi.useFakeTimers()
    try {
      const timeout = createTimeoutSignal(25)

      expect(timeout.signal.aborted).toBe(false)
      expect(timeout.didTimeout()).toBe(false)

      await vi.advanceTimersByTimeAsync(25)

      expect(timeout.signal.aborted).toBe(true)
      expect(timeout.didTimeout()).toBe(true)
      timeout.dispose()
    } finally {
      vi.useRealTimers()
    }
  })
})
