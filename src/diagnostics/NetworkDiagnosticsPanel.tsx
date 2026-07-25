import {
  useState,
  useSyncExternalStore,
} from 'react'
import {
  DemoApiError,
  probeDemoSession,
} from '../ai/demoApi'
import {
  getNetworkDiagnosticsEnvironment,
  isNetworkDiagnosticsEnabled,
  networkDiagnostics,
} from './networkDiagnostics'
import './NetworkDiagnosticsPanel.css'

interface ProbeResult {
  ok: true
  status: number
}

export function NetworkDiagnosticsPanel({
  probe = probeDemoSession,
}: {
  probe?: () => Promise<ProbeResult>
} = {}) {
  const enabled = isNetworkDiagnosticsEnabled()
  const snapshot = useSyncExternalStore(
    networkDiagnostics.subscribe,
    networkDiagnostics.getSnapshot,
    networkDiagnostics.getSnapshot,
  )
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [probing, setProbing] = useState(false)

  if (!enabled) return null

  const environment = getNetworkDiagnosticsEnvironment()
  const runProbe = async () => {
    setProbing(true)
    setStatus('SESSION 检查中…')
    try {
      const result = await probe()
      setStatus(`SESSION ${result.status}`)
    } catch (error) {
      if (error instanceof DemoApiError) {
        const requestId = error.requestId.slice(0, 8)
        setStatus(
          `SESSION ${error.status || 0} · ${error.code}${
            requestId ? ` · ${requestId}` : ''
          }`,
        )
      } else {
        setStatus('SESSION 0 · NETWORK_ERROR')
      }
    } finally {
      setProbing(false)
    }
  }

  const copyReport = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('unavailable')
      await navigator.clipboard.writeText(networkDiagnostics.report())
      setStatus('诊断报告已复制')
    } catch {
      setStatus('复制失败，请使用浏览器检查工具')
    }
  }

  return (
    <>
      <button
        type="button"
        className="network-diagnostics-trigger"
        aria-label="网络诊断"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        NET
        <span aria-hidden="true">{snapshot.events.length}</span>
      </button>

      {open ? (
        <div className="network-diagnostics-mask">
          <section
            className="network-diagnostics-panel"
            role="dialog"
            aria-modal="true"
            aria-label="网络诊断"
          >
            <header className="network-diagnostics-header">
              <div>
                <strong>网络诊断</strong>
                <small>NETWORK TRACE · SAFE MODE</small>
              </div>
              <button
                type="button"
                aria-label="关闭网络诊断"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>

            <div className="network-diagnostics-environment">
              <p>
                <b>ORIGIN</b> {environment.origin}
              </p>
              <p>
                <b>ONLINE</b> {environment.online ? 'YES' : 'NO'}
                {' · '}
                <b>NET</b> {environment.connection}
              </p>
              <p>
                <b>CAP</b>{' '}
                {environment.capabilities.abortController ? 'AC✓' : 'AC×'}
                {' '}
                {environment.capabilities.abortSignalTimeout
                  ? 'AST✓'
                  : 'AST×'}
                {' '}
                {environment.capabilities.randomUUID ? 'UUID✓' : 'UUID×'}
                {' '}
                {environment.capabilities.sessionStorage ? 'SS✓' : 'SS×'}
              </p>
              <p className="network-diagnostics-ua">
                <b>UA</b> {environment.userAgent}
              </p>
            </div>

            <div
              className="network-diagnostics-events"
              aria-live="polite"
            >
              {snapshot.events.length === 0 ? (
                <p className="network-diagnostics-empty">
                  暂无请求记录
                </p>
              ) : (
                [...snapshot.events].reverse().map((event, index) => (
                  <article
                    key={`${event.requestId}-${event.stage}-${index}`}
                    className={`network-diagnostics-event is-${event.stage}`}
                  >
                    <strong>
                      {event.operation.toUpperCase()} ·{' '}
                      {event.stage.toUpperCase()}
                    </strong>
                    <span>
                      {event.status ?? 0}
                      {event.code ? ` · ${event.code}` : ''}
                    </span>
                    <small>
                      {event.durationMs ?? 0}ms ·{' '}
                      {event.requestId.slice(0, 8)}
                    </small>
                    {event.contextMeta ? (
                      <div className="network-diagnostics-context">
                        <b>
                          CONTEXT V{event.contextMeta.contextVersion}
                          {' · '}
                          {event.contextMeta.serializedBytes.toLocaleString(
                            'en-US',
                          )}{' '}
                          BYTES
                        </b>
                        <span>
                          {event.contextMeta.inventoryCount} INVENTORY
                          {' · '}
                          {event.contextMeta.plannedMealCount} MEALS
                          {' · '}
                          {event.contextMeta.missingItemCount} MISSING
                          {' · '}
                          {event.contextMeta.recipeCount} RECIPES
                        </span>
                        <span>
                          {event.contextMeta.truncated
                            ? 'TRUNCATED'
                            : 'NO TRUNCATION'}
                          {' · '}
                          {event.contextMeta.omittedCount} OMITTED
                        </span>
                      </div>
                    ) : null}
                    <code>{event.target}</code>
                  </article>
                ))
              )}
            </div>

            {status ? (
              <p className="network-diagnostics-status">{status}</p>
            ) : null}

            <footer className="network-diagnostics-actions">
              <button
                type="button"
                disabled={probing}
                onClick={() => void runProbe()}
              >
                {probing ? '检查中…' : '运行自检'}
              </button>
              <button type="button" onClick={() => void copyReport()}>
                复制报告
              </button>
              <button
                type="button"
                onClick={() => {
                  networkDiagnostics.clear()
                  setStatus('记录已清空')
                }}
              >
                清空记录
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  )
}
