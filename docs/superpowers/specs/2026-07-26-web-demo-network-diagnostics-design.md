# Web Demo Network Diagnostics Design

## Objective

Add an opt-in, mobile-friendly diagnostics surface for the stateless Web Demo so cross-device request failures can be located without exposing secrets or changing the normal public experience.

The feature is enabled only when the page URL contains `debug=network`. Normal visitors continue to see the existing deterministic fallback. Debug users see the same fallback plus a short diagnostic code and can open a panel that reports safe request metadata.

## Scope

The P0 scope covers:

- anonymous demo session creation;
- Agent and recommendation requests;
- speech transcription and recipe illustration requests;
- browser-side request timing and failure classification;
- end-to-end request IDs;
- structured Vercel function logs;
- a copyable diagnostic report;
- both Vercel and Retinbox `/demo` deployments.

It does not add persistent user state, store prompts, install third-party telemetry, expose gateway configuration, or change the mock world's read-only semantics.

## Architecture

### Diagnostics store

Create a small browser-only diagnostics module with an in-memory external store. It owns:

- whether diagnostics are enabled from `debug=network`;
- a bounded list of the latest 40 request events;
- browser capability metadata needed for compatibility diagnosis;
- a subscription API consumed by React;
- a safe report serializer.

Each event contains:

- generated client request ID;
- operation (`session`, `agent`, `recommend`, `transcribe`, `illustrate`);
- request stage (`start`, `response`, `parse`, `success`, `failure`);
- safe target origin and pathname;
- HTTP status when available;
- public error code when available;
- duration in milliseconds;
- timestamp.

Events must never contain Authorization headers, session tokens, API keys, prompts, audio, image payloads, inventory snapshots, raw server response bodies, or full query strings.

### Browser request instrumentation

The existing managed request functions remain the single transport boundary. A shared request helper will:

1. generate a client request ID;
2. attach it as `x-request-id`;
3. record start time;
4. use a portable timeout signal built with `AbortController`, avoiding a hard dependency on `AbortSignal.timeout`;
5. record HTTP status and duration;
6. preserve safe server error codes;
7. classify browser exceptions as `TIMEOUT`, `NETWORK_ERROR`, `ABORTED`, or `RESPONSE_INVALID`.

Session acquisition remains cached in `sessionStorage`. A rejected cached token may be cleared and retried once only when the server returns `401`, preventing a stale session from forcing the fallback for the remainder of the tab.

`DemoApiError` gains a `requestId` field. The managed runtime continues returning the deterministic fallback but, in diagnostics mode, appends a notice containing only the public code and shortened request ID.

### Server request tracing

Each managed API boundary accepts a valid client `x-request-id` or generates a UUID. The response always returns `x-request-id`, including CORS preflight and errors. CORS allows `x-request-id` and exposes it to browser JavaScript.

Server routes emit one-line JSON logs for:

- request start;
- request completion;
- upstream non-success status;
- upstream timeout/network failure;
- upstream response parse rejection.

Fields are limited to `level`, `event`, `route`, `requestId`, `status`, `durationMs`, and a bounded upstream status/error category. No request or response content is logged.

### Diagnostic panel

Render one fixed, compact “NET” button above the application only when diagnostics are enabled. It opens a bottom sheet designed for narrow mobile screens.

The panel shows:

- page origin and user agent;
- online status;
- support for `AbortController`, `AbortSignal.timeout`, `crypto.randomUUID`, `sessionStorage`, and `navigator.connection` where available;
- request history with operation, stage, status/code, duration, and short request ID;
- “运行自检” to exercise session creation without consuming an Agent generation;
- “复制报告”;
- “清空记录”;
- close button.

The panel is accessible by keyboard, uses existing pixel styling, and does not cover the bottom navigation when closed.

## Error Model

Public client codes:

- `DEMO_SESSION_UNAVAILABLE`
- `DEMO_SESSION_REQUIRED`
- `DEMO_RATE_LIMITED`
- `AGENT_UNAVAILABLE`
- `TRANSCRIPTION_UNAVAILABLE`
- `IMAGE_UNAVAILABLE`
- `TIMEOUT`
- `NETWORK_ERROR`
- `ABORTED`
- `RESPONSE_INVALID`

The UI never displays raw exception text from the network or upstream. Server error JSON is parsed only for the allowlisted `error.code`.

## Testing

Unit tests must prove:

- diagnostics are disabled by default and enabled by `debug=network`;
- the store bounds and redacts report data;
- request IDs are attached and returned error codes are preserved;
- portable timeouts work without `AbortSignal.timeout`;
- the panel renders, runs the session self-test, copies a report, and clears history;
- runtime fallback includes diagnostics only in debug mode;
- server CORS exposes request IDs;
- Agent/session/transcribe/illustrate handlers return the same request ID and emit redacted structured logs.

Regression verification includes the full Vitest suite, TypeScript/API typechecks, production builds for Vercel and Retinbox, and browser checks on both deployed URLs with `?debug=network`.

## Deployment and Success Criteria

Push the implementation to `main`. Vercel deploys from `main`; Retinbox deploys through the existing deployment workflow. Deployment is complete only when both public `/demo?debug=network` URLs:

- load the diagnostic button and panel;
- complete the session self-test;
- produce copyable safe JSON;
- still support Agent requests;
- contain no broken UI or leaked credential material.
