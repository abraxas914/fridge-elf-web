export type NetworkOperation =
  | 'session'
  | 'agent'
  | 'recommend'
  | 'transcribe'
  | 'illustrate'

export type NetworkStage =
  | 'start'
  | 'response'
  | 'parse'
  | 'success'
  | 'failure'

export interface NetworkDiagnosticEvent {
  requestId: string
  operation: NetworkOperation
  stage: NetworkStage
  target: string
  timestamp: string
  durationMs?: number
  status?: number
  code?: string
}

export interface NetworkDiagnosticsSnapshot {
  revision: number
  events: readonly NetworkDiagnosticEvent[]
}

export interface NetworkDiagnosticsStore {
  clear(): void
  getSnapshot(): NetworkDiagnosticsSnapshot
  record(event: NetworkDiagnosticEvent): void
  report(): string
  subscribe(listener: () => void): () => void
}

interface NetworkDiagnosticsStoreOptions {
  enabled?: () => boolean
  maxEvents?: number
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/
const DEFAULT_MAX_EVENTS = 40

export function isNetworkDiagnosticsEnabled(
  search = globalThis.location?.search ?? '',
) {
  return new URLSearchParams(search).get('debug') === 'network'
}

export function safeNetworkTarget(input: string) {
  const base =
    globalThis.location?.href ??
    'https://fridge-elf.invalid/'
  try {
    const url = new URL(input, base)
    return `${url.origin}${url.pathname}`
  } catch {
    return 'invalid-target'
  }
}

function storageAvailable() {
  try {
    const storage = globalThis.sessionStorage
    return !!storage
  } catch {
    return false
  }
}

export function getNetworkDiagnosticsEnvironment() {
  const signal = globalThis.AbortSignal as typeof AbortSignal & {
    timeout?: unknown
  }
  const navigatorValue = globalThis.navigator
  const connection = navigatorValue as Navigator & {
    connection?: {
      effectiveType?: string
      saveData?: boolean
    }
  }
  return {
    origin: globalThis.location?.origin ?? '',
    pathname: globalThis.location?.pathname ?? '',
    userAgent: navigatorValue?.userAgent ?? '',
    online: navigatorValue?.onLine ?? true,
    connection: connection?.connection?.effectiveType ?? 'unavailable',
    saveData: connection?.connection?.saveData ?? false,
    capabilities: {
      abortController: typeof globalThis.AbortController === 'function',
      abortSignalTimeout: typeof signal?.timeout === 'function',
      randomUUID:
        typeof globalThis.crypto?.randomUUID === 'function',
      sessionStorage: storageAvailable(),
      networkInformation: !!connection?.connection,
    },
  }
}

export function createNetworkDiagnosticsStore(
  options: NetworkDiagnosticsStoreOptions = {},
): NetworkDiagnosticsStore {
  const enabled =
    options.enabled ?? (() => isNetworkDiagnosticsEnabled())
  const maxEvents = Math.max(1, options.maxEvents ?? DEFAULT_MAX_EVENTS)
  const listeners = new Set<() => void>()
  let snapshot: NetworkDiagnosticsSnapshot = {
    revision: 0,
    events: [],
  }

  const publish = (events: readonly NetworkDiagnosticEvent[]) => {
    snapshot = {
      revision: snapshot.revision + 1,
      events,
    }
    listeners.forEach((listener) => listener())
  }

  return {
    clear() {
      publish([])
    },
    getSnapshot() {
      return snapshot
    },
    record(event) {
      if (!enabled()) return
      publish([...snapshot.events, { ...event }].slice(-maxEvents))
    },
    report() {
      return JSON.stringify(
        {
          version: 1,
          generatedAt: new Date().toISOString(),
          page: getNetworkDiagnosticsEnvironment(),
          events: snapshot.events,
        },
        null,
        2,
      )
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export const networkDiagnostics = createNetworkDiagnosticsStore()

export function createNetworkRequestId() {
  try {
    const candidate = globalThis.crypto?.randomUUID?.()
    if (candidate && REQUEST_ID_PATTERN.test(candidate)) return candidate
  } catch {
    // A random fallback remains sufficient for correlation.
  }
  return `web-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`
}

export function isSafeNetworkRequestId(value: string | null) {
  return !!value && REQUEST_ID_PATTERN.test(value)
}

export function beginNetworkRequest(
  operation: NetworkOperation,
  target: string,
  store: NetworkDiagnosticsStore = networkDiagnostics,
  now: () => number = () => Date.now(),
) {
  const requestId = createNetworkRequestId()
  const startedAt = now()
  const safeTarget = safeNetworkTarget(target)
  const record = (
    stage: NetworkStage,
    details: Pick<
      NetworkDiagnosticEvent,
      'status' | 'code'
    > = {},
  ) => {
    const current = now()
    store.record({
      requestId,
      operation,
      stage,
      target: safeTarget,
      timestamp: new Date(current).toISOString(),
      ...(stage === 'start'
        ? {}
        : { durationMs: Math.max(0, current - startedAt) }),
      ...details,
    })
  }

  record('start')
  return {
    requestId,
    parse() {
      record('parse')
    },
    response(status: number) {
      record('response', { status })
    },
    success(status?: number) {
      record('success', { status })
    },
    failure(code: string, status?: number) {
      record('failure', { code, status })
    },
  }
}

export function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController()
  let timedOut = false
  const timer = globalThis.setTimeout(() => {
    timedOut = true
    try {
      controller.abort(
        new DOMException('Request timed out', 'TimeoutError'),
      )
    } catch {
      controller.abort()
    }
  }, timeoutMs)

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose() {
      globalThis.clearTimeout(timer)
    },
  }
}
