# Web Demo Network Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in mobile network diagnostics panel and safe end-to-end request tracing to every managed Web Demo AI request.

**Architecture:** A browser-only external store records bounded, redacted request events and feeds an opt-in React bottom sheet. The existing managed API client becomes the single instrumentation boundary and uses portable abort timeouts. Managed server handlers propagate `x-request-id`, expose it through CORS, and emit content-free structured logs.

**Tech Stack:** React 19, TypeScript 5.9, Vitest, Testing Library, Vite, Vercel Node functions.

---

## File structure

- Create `src/diagnostics/networkDiagnostics.ts`: debug-mode detection, bounded event store, safe report serialization, request trace lifecycle, portable timeout helper.
- Create `src/diagnostics/networkDiagnostics.test.ts`: store, redaction, request ID, and timeout tests.
- Create `src/diagnostics/NetworkDiagnosticsPanel.tsx`: opt-in panel, session self-test, copy, clear, browser metadata.
- Create `src/diagnostics/NetworkDiagnosticsPanel.css`: mobile bottom-sheet and pixel styling.
- Create `src/diagnostics/NetworkDiagnosticsPanel.test.tsx`: panel behavior tests.
- Modify `src/RootApp.tsx`: render the panel on `/demo`.
- Modify `src/ai/demoApi.ts`: instrument session, Agent, illustration, and transcription fetches; preserve safe server error codes.
- Modify `src/ai/demoApi.test.ts`: transport and compatibility regression tests.
- Modify `src/demo/demoRuntime.ts`: add safe code/request ID to fallback only in debug mode.
- Modify `src/demo/demoRuntime.test.ts`: fallback diagnostics tests.
- Modify `api/_lib/demoCors.ts`: request ID creation/validation, CORS allow/expose headers, structured logging helper.
- Modify API handler tests: verify request ID propagation and redacted logging.
- Modify `api/_lib/demoAgent.ts`, `api/_lib/demoSession.ts`, `api/demo/transcribe.ts`, and `api/illustrate.ts`: trace start/completion at managed server boundaries.

### Task 1: Browser diagnostics core

**Files:**
- Create: `src/diagnostics/networkDiagnostics.ts`
- Create: `src/diagnostics/networkDiagnostics.test.ts`

- [ ] **Step 1: Write failing tests**

Define the wished-for public API in tests:

```ts
expect(isNetworkDiagnosticsEnabled('?debug=network')).toBe(true)
expect(isNetworkDiagnosticsEnabled('?debug=other')).toBe(false)

const store = createNetworkDiagnosticsStore({ maxEvents: 2 })
store.record(event('one'))
store.record(event('two'))
store.record(event('three'))
expect(store.getSnapshot().events.map(({ requestId }) => requestId))
  .toEqual(['two', 'three'])
expect(store.report()).not.toContain('Bearer')

vi.stubGlobal('AbortSignal', class {})
const timeout = createTimeoutSignal(5)
await vi.waitFor(() => expect(timeout.signal.aborted).toBe(true))
timeout.dispose()
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --run src/diagnostics/networkDiagnostics.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the minimal core**

Implement:

```ts
export type NetworkOperation =
  | 'session' | 'agent' | 'recommend' | 'transcribe' | 'illustrate'
export type NetworkStage =
  | 'start' | 'response' | 'parse' | 'success' | 'failure'

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
```

Use `crypto.randomUUID()` when available and a random hexadecimal fallback otherwise. `safeTarget()` must retain only `origin + pathname`. The store keeps at most 40 events by default, returns stable snapshots for `useSyncExternalStore`, and serializes only defined event fields plus safe browser capability flags. `createTimeoutSignal()` must use `AbortController` and `setTimeout`, not `AbortSignal.timeout`.

- [ ] **Step 4: Verify GREEN**

Run the focused test and expect all tests to pass.

- [ ] **Step 5: Commit**

```bash
git add src/diagnostics/networkDiagnostics.ts src/diagnostics/networkDiagnostics.test.ts
git commit -m "feat: add safe network diagnostics core"
```

### Task 2: Instrument managed browser requests

**Files:**
- Modify: `src/ai/demoApi.ts`
- Modify: `src/ai/demoApi.test.ts`

- [ ] **Step 1: Write failing transport tests**

Add tests proving:

```ts
expect(new Headers(fetcher.mock.calls[0][1].headers).get('x-request-id'))
  .toMatch(/^[a-zA-Z0-9_-]{8,80}$/)
```

For a `429` response containing:

```json
{"error":{"code":"DEMO_RATE_LIMITED","message":"bounded"}}
```

assert `DemoApiError` preserves `code`, `status`, and the response `x-request-id`. Stub `AbortSignal.timeout` as unavailable and assert the request still runs. Assert diagnostics never serialize the Bearer token or request body.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --run src/ai/demoApi.test.ts
```

Expected: FAIL because requests do not attach IDs and timeout construction still calls `AbortSignal.timeout`.

- [ ] **Step 3: Implement one shared instrumented fetch boundary**

Add `requestId?: string` to `DemoApiError`. Wrap each request in:

```ts
const trace = beginNetworkRequest(operation, demoApiUrl(path, location))
const timeout = createTimeoutSignal(timeoutMs)
try {
  const response = await fetcher(url, {
    ...init,
    headers: { ...headers, 'x-request-id': trace.requestId },
    signal: timeout.signal,
  })
  trace.response(response.status, response.headers.get('x-request-id'))
  // parse and finish
} catch (error) {
  trace.failure(classifyNetworkError(error))
  throw toDemoApiError(error, trace.requestId)
} finally {
  timeout.dispose()
}
```

Parse only the allowlisted `error.code` value from non-success JSON. Do not retain raw response text. Add `probeDemoSession()` that always requests a fresh session without placing its token in the returned result.

- [ ] **Step 4: Verify GREEN**

Run the focused tests and expect all tests to pass.

- [ ] **Step 5: Commit**

```bash
git add src/ai/demoApi.ts src/ai/demoApi.test.ts
git commit -m "feat: trace managed demo browser requests"
```

### Task 3: Build the opt-in mobile panel

**Files:**
- Create: `src/diagnostics/NetworkDiagnosticsPanel.tsx`
- Create: `src/diagnostics/NetworkDiagnosticsPanel.css`
- Create: `src/diagnostics/NetworkDiagnosticsPanel.test.tsx`
- Modify: `src/RootApp.tsx`
- Modify: `src/RootApp.test.tsx`

- [ ] **Step 1: Write failing component tests**

Render `RootApp` under `/demo` and assert:

```ts
expect(screen.queryByRole('button', { name: '网络诊断' })).not.toBeInTheDocument()
```

Under `/demo?debug=network`, assert the NET button appears. Open the panel, record an event, and assert operation/status/request ID appear. Mock clipboard and `probeDemoSession()`; assert “运行自检”, “复制报告”, and “清空记录” execute safely.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --run src/diagnostics/NetworkDiagnosticsPanel.test.tsx src/RootApp.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the panel**

Use `useSyncExternalStore(networkDiagnostics.subscribe, networkDiagnostics.getSnapshot)`. Render nothing unless `isNetworkDiagnosticsEnabled(window.location.search)` is true. The open sheet uses `role="dialog"`, `aria-modal="true"`, a labelled close button, and rows with:

```text
AGENT · FAILURE · 429 DEMO_RATE_LIMITED · 842ms · 8C21A9
```

Display origin, online state, UA, and capability flags. Copy `networkDiagnostics.report()` through `navigator.clipboard.writeText`. If clipboard fails, show a local, non-sensitive status message.

- [ ] **Step 4: Verify GREEN**

Run focused component tests and expect all to pass.

- [ ] **Step 5: Commit**

```bash
git add src/diagnostics src/RootApp.tsx src/RootApp.test.tsx
git commit -m "feat: add mobile network diagnostics panel"
```

### Task 4: Preserve diagnostic failure identity in fallback

**Files:**
- Modify: `src/demo/demoRuntime.ts`
- Modify: `src/demo/demoRuntime.test.ts`

- [ ] **Step 1: Write failing tests**

Reject the requester with:

```ts
new DemoApiError('DEMO_RATE_LIMITED', 429, 'request-8c21a9')
```

Assert normal mode retains the existing notice exactly. Enable `debug=network` and assert the notice becomes:

```text
当前展示的是本地演示回退结果 · DEMO_RATE_LIMITED · 8C21A9
```

- [ ] **Step 2: Verify RED**

Run the focused runtime test and expect the debug assertion to fail.

- [ ] **Step 3: Implement minimal safe formatting**

Narrow the caught error to `DemoApiError`, allowlist public codes, shorten and uppercase the request ID, and append only in debug mode. Never render `error.message`.

- [ ] **Step 4: Verify GREEN**

Run the focused runtime tests and expect all to pass.

- [ ] **Step 5: Commit**

```bash
git add src/demo/demoRuntime.ts src/demo/demoRuntime.test.ts
git commit -m "feat: expose safe fallback diagnostics"
```

### Task 5: Propagate request IDs and structured server logs

**Files:**
- Modify: `api/_lib/demoCors.ts`
- Modify: `api/_lib/demoSession.ts`
- Modify: `api/_lib/demoAgent.ts`
- Modify: `api/demo/transcribe.ts`
- Modify: `api/illustrate.ts`
- Modify tests under `api/**/*.test.ts` and `tests/api/illustrate.test.ts`

- [ ] **Step 1: Write failing API tests**

For a request with `x-request-id: mobile-test-123`, assert:

```ts
expect(response.headers.get('x-request-id')).toBe('mobile-test-123')
expect(response.headers.get('access-control-expose-headers'))
  .toContain('x-request-id')
expect(response.headers.get('access-control-allow-headers'))
  .toContain('x-request-id')
```

Spy on `console.log`/`console.error`, invoke success and upstream failure paths, parse every logged line as JSON, and assert no line contains `authorization`, `Bearer`, the user question, snapshot item names, or session token.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --run api/demo-session.test.ts api/demo-agent.test.ts api/demo/transcribe.test.ts tests/api/illustrate.test.ts
```

Expected: FAIL because responses do not expose or consistently propagate request IDs.

- [ ] **Step 3: Implement server tracing**

In `demoCors.ts`, add:

```ts
export function demoRequestId(request: Request) {
  const supplied = request.headers.get('x-request-id')?.trim() ?? ''
  return /^[A-Za-z0-9_-]{8,80}$/.test(supplied)
    ? supplied
    : randomUUID()
}
```

Allow and expose `x-request-id`; set it on all managed responses. Add:

```ts
export function logDemoRequest(entry: SafeLogEntry) {
  const output = JSON.stringify(entry)
  entry.level === 'error' ? console.error(output) : console.log(output)
}
```

At each handler boundary record start time, log start, invoke the existing implementation, add the response request ID, and log completion with status/duration. Agent upstream failures additionally log only an error category and upstream status.

- [ ] **Step 4: Verify GREEN**

Run focused API tests and expect all to pass.

- [ ] **Step 5: Commit**

```bash
git add api tests/api
git commit -m "feat: trace managed demo server requests"
```

### Task 6: Full local verification

**Files:**
- Modify only if verification reveals a scoped defect.

- [ ] **Step 1: Run formatting/diff checks**

```bash
git diff --check
```

Expected: exit 0.

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all Vitest files and tests pass.

- [ ] **Step 3: Run production builds**

```bash
npm run build
npm run build:rth
npm run test:rth-html
```

Expected: all commands exit 0 and Retinbox HTML retains the Vercel BFF in `connect-src`.

- [ ] **Step 4: Run local browser verification**

Start Vite and inspect `/demo?debug=network` at mobile and desktop viewports. Verify panel open/close, session self-test, copied report redaction, and normal `/demo` absence.

- [ ] **Step 5: Commit any scoped verification fixes**

Use a narrowly named commit; do not stage the pre-existing untracked QR assets.

### Task 7: Push, deploy, and production verification

**Files:**
- No planned source changes.

- [ ] **Step 1: Verify the final commit and working tree**

```bash
git status --short
git log -1 --oneline
```

Expected: only the pre-existing QR assets are untracked.

- [ ] **Step 2: Push `main`**

```bash
git push origin main
```

Expected: remote `main` advances to the local verified SHA.

- [ ] **Step 3: Wait for Vercel and Retinbox deployments**

Inspect GitHub checks and both deployment providers until the pushed SHA is successful. Do not test stale production aliases.

- [ ] **Step 4: Verify both public URLs**

Check:

```text
https://fridge-elf-app.vercel.app/demo?debug=network
https://fridgeelf.rth1.xyz/demo/?debug=network
```

At both origins verify the panel, self-test, safe copy report, Agent request, request ID visibility, and no credential material.

- [ ] **Step 5: Scan production runtime errors**

Review Vercel runtime logs for the deployed SHA. Correlate any failure using the panel request ID and report exact status without exposing payloads.
