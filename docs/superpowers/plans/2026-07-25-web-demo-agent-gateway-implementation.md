# Web Demo Agent Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make both public `/demo` deployments use the same stateless, read-only Agent, recommendation, and illustration gateway while keeping all model credentials server-only.

**Architecture:** Vercel Functions provide a shared BFF for both the Vercel SPA and the static Retinbox mirror. The browser sends a bounded snapshot of the in-memory mock world with an HMAC-signed anonymous session; the BFF validates and normalizes OpenAI-compatible gateway responses, while existing fixtures remain the failure fallback.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Playwright, Vercel Node Functions, Web Crypto/Node crypto, OpenAI-compatible HTTP APIs.

---

### Task 1: Freeze anonymous session and CORS contracts

**Files:**
- Create: `api/_lib/demoCors.ts`
- Create: `api/_lib/demoSession.ts`
- Create: `api/demo/session.ts`
- Create: `api/demo-session.test.ts`
- Modify: `tsconfig.api.json`

- [ ] **Step 1: Write failing tests**

Cover exact-origin CORS, rejected origins, `OPTIONS`, signed token issuance,
expiry, tampering and missing secrets.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- api/demo-session.test.ts
```

Expected: fail because the session modules do not exist.

- [ ] **Step 3: Implement the minimal contract**

Use Node `randomUUID`, `createHmac` and `timingSafeEqual`. Token shape:

```text
v1.<expires-seconds>.<session-uuid>.<base64url-hmac>
```

Export:

```ts
export function issueDemoSession(secret: string, now?: number): DemoSession
export function verifyDemoSession(token: string, secret: string, now?: number): boolean
export function corsHeaders(request: Request): Headers
export function handleDemoSessionRequest(request: Request, env: DemoEnvironment): Response
```

- [ ] **Step 4: Verify GREEN**

Run the focused test and `npm run typecheck:api`.

- [ ] **Step 5: Commit**

```bash
git add api tsconfig.api.json
git commit -m "feat(api): add anonymous demo sessions"
```

### Task 2: Implement bounded snapshot and headless text gateway

**Files:**
- Create: `api/_lib/demoAgent.ts`
- Create: `api/demo/agent.ts`
- Create: `api/demo/recommend.ts`
- Create: `api/demo-agent.test.ts`
- Modify: `tsconfig.api.json`

- [ ] **Step 1: Write failing tests**

Test:

- missing/invalid bearer session;
- message over 800 characters;
- oversized and malformed snapshot;
- agent and recommend prompts remain distinct;
- Bearer gateway authentication and configured model;
- JSON fence parsing;
- response allowlisting;
- upstream timeout, `429` and invalid JSON error cleaning;
- no upstream body or endpoint in returned errors.

- [ ] **Step 2: Verify RED**

```bash
npm test -- api/demo-agent.test.ts
```

- [ ] **Step 3: Implement the minimal BFF**

Use:

```ts
export interface DemoWorldSnapshot { /* approved schema */ }
export interface DemoAgentResponse { /* approved schema */ }
export async function handleDemoAgentRequest(
  request: Request,
  env: DemoAgentEnvironment,
  mode: 'agent' | 'recommend',
  fetcher?: typeof fetch,
): Promise<Response>
```

Call:

```text
<HEADLESS_GATEWAY_BASE_URL>/v1/chat/completions
```

with `stream: false`, fixed system prompts and `gpt-5.4` from the environment.

- [ ] **Step 4: Verify GREEN**

Run focused tests and `npm run typecheck:api`.

- [ ] **Step 5: Commit**

```bash
git add api tsconfig.api.json
git commit -m "feat(api): proxy stateless demo agent"
```

### Task 3: Add the browser session and API adapter

**Files:**
- Create: `src/ai/demoApi.ts`
- Create: `src/ai/demoApi.test.ts`
- Create: `src/ai/demoWorld.ts`
- Create: `src/ai/demoWorld.test.ts`

- [ ] **Step 1: Write failing tests**

Test:

- Vercel/local origins use relative `/api`;
- `fridgeelf.rth1.xyz` uses the Vercel production BFF origin;
- session Token is reused from `sessionStorage`;
- failed session acquisition rejects with a stable local error;
- snapshot maps expiry levels and only allowed fields;
- available recipe IDs come from `RECIPES`.

- [ ] **Step 2: Verify RED**

```bash
npm test -- src/ai/demoApi.test.ts src/ai/demoWorld.test.ts
```

- [ ] **Step 3: Implement the adapter**

Expose:

```ts
export function demoApiUrl(path: string, location?: Location): string
export async function getDemoSession(options?: DemoSessionOptions): Promise<string>
export async function requestDemoAgent(input: DemoAgentInput, options?: DemoRequestOptions): Promise<DemoAgentResponse>
export function buildDemoWorldSnapshot(input: DemoWorldInput): DemoWorldSnapshot
```

Store only the opaque session response in `sessionStorage`.

- [ ] **Step 4: Verify GREEN**

Run focused tests.

- [ ] **Step 5: Commit**

```bash
git add src/ai
git commit -m "feat(web): add shared demo agent adapter"
```

### Task 4: Replace fixtures with online-first panels

**Files:**
- Create: `src/scenes/recipe/DemoAgentPanel.tsx`
- Create: `src/scenes/recipe/DemoAgentPanel.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/scenes/recipe/RecipeScene.css`

- [ ] **Step 1: Write failing component tests**

Test loading copy, successful answer, allowed recipe navigation, unknown recipe
ID rejection, timeout/429/network fixture fallback, and absence of dispatchable
action handling.

- [ ] **Step 2: Verify RED**

```bash
npm test -- src/scenes/recipe/DemoAgentPanel.test.tsx src/App.test.tsx
```

- [ ] **Step 3: Implement minimal UI integration**

Build one panel with:

```ts
type DemoAgentMode = 'agent' | 'recommend'
```

It receives the current snapshot, optional message and an `onOpenRecipe`
callback. It calls the adapter once per mount, renders the approved loading and
fallback copy, and only resolves recipe IDs through the local `RECIPES` array.

- [ ] **Step 4: Verify GREEN**

Run focused tests and the complete `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/scenes/recipe
git commit -m "feat(demo): connect read-only agent experiences"
```

### Task 5: Make Demo state ephemeral and restartable

**Files:**
- Modify: `src/bridge/browserMock.ts`
- Modify: `src/bridge/nativeBridge.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing tests**

Assert browser inventory never reads or writes `localStorage`, a new browser
runtime starts from `GOLDEN_FOODS`, and “重新开始 Demo” restores the initial
world.

- [ ] **Step 2: Verify RED**

```bash
npm test -- src/bridge/nativeBridge.test.ts src/App.test.tsx
```

- [ ] **Step 3: Remove business persistence**

Make `createBrowserMock()` hold inventory only in its closure. Add a restart
handler that reloads the Demo route without persisting state.

- [ ] **Step 4: Verify GREEN**

Run focused tests and full unit tests.

- [ ] **Step 5: Commit**

```bash
git add src/bridge src/App.tsx src/App.test.tsx
git commit -m "fix(demo): reset mock world between visits"
```

### Task 6: Route illustration through the headless image configuration

**Files:**
- Modify: `api/_lib/illustrate.ts`
- Modify: `api/illustrate.ts`
- Modify: `api/illustrate.test.ts`
- Modify: `src/scenes/recipe/IllustrationModal.tsx`
- Modify: `src/scenes/recipe/IllustrationModal.test.tsx`

- [ ] **Step 1: Write failing tests**

Require the headless image variables, configured model, shared anonymous bearer
session, Retinbox CORS and sanitized failures.

- [ ] **Step 2: Verify RED**

```bash
npm test -- api/illustrate.test.ts src/scenes/recipe/IllustrationModal.test.tsx
```

- [ ] **Step 3: Implement compatibility**

Use `HEADLESS_IMAGE_GATEWAY_BASE_URL`,
`HEADLESS_IMAGE_GATEWAY_API_KEY` and
`HEADLESS_IMAGE_GATEWAY_MODEL`, while temporarily accepting existing
`IMAGE_API_ENDPOINT` and `IMAGE_API_KEY` as local compatibility fallbacks.

- [ ] **Step 4: Verify GREEN**

Run focused tests and API type checking.

- [ ] **Step 5: Commit**

```bash
git add api src/scenes/recipe
git commit -m "feat(api): unify demo image gateway"
```

### Task 7: Add Retinbox CSP and Vercel route packaging

**Files:**
- Modify: `index.html`
- Modify: `vercel.json`
- Modify: `api/vercel-routing.test.ts`
- Modify: `scripts/retinbox-html.node-test.mjs`
- Modify: `.env.example`

- [ ] **Step 1: Write failing packaging tests**

Assert the three flat Vercel entrypoints and public rewrites exist, Retinbox CSP
allows only the Vercel BFF for cross-origin connections, and `.env.example`
contains empty server-only variable names without values.

- [ ] **Step 2: Verify RED**

```bash
npm test -- api/vercel-routing.test.ts
npm run test:rth-html
```

- [ ] **Step 3: Implement packaging**

Add rewrites for nested public routes to flat function files if Vercel Vite
packaging requires them. Add CSP meta compatible with the stricter Vercel
header.

- [ ] **Step 4: Verify GREEN**

Run focused tests, `npm run build`, and `npm run build:rth`.

- [ ] **Step 5: Commit**

```bash
git add index.html vercel.json api/vercel-routing.test.ts scripts .env.example
git commit -m "chore(deploy): expose shared demo gateway"
```

### Task 8: Verify the real gateway without leaking content

**Files:**
- Create: `scripts/probe-headless-gateway.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Write a failing node test for probe result redaction**

The probe must output only endpoint category, HTTP status, model and response
shape. It must never output a Token, prompt or response text.

- [ ] **Step 2: Verify RED**

Run the probe test and confirm missing implementation.

- [ ] **Step 3: Implement the probe**

Load `.env.local` explicitly, call `/v1/models` and `/v1/chat/completions`, and
print redacted structural results.

- [ ] **Step 4: Run the live probe**

Expected: authenticated model listing and one valid completion shape.

- [ ] **Step 5: Commit**

```bash
git add scripts package.json .gitignore
git commit -m "test(api): add redacted gateway probe"
```

### Task 9: Full local verification

**Files:**
- Modify: `docs/WEB_PREVIEW_SPEC.md`
- Modify: `README.md`

- [ ] **Step 1: Update documentation**

Document the dual-domain BFF, anonymous session, Fixture fallback, environment
variable names and accepted HTTP upstream risk without including values.

- [ ] **Step 2: Run all verification**

```bash
npm test
npm run typecheck:api
npm run build
npm run build:rth
npm run test:rth-html
npm run e2e
git diff --check
```

- [ ] **Step 3: Scan for leaks**

Search source and both build outputs for the actual secret prefixes and raw
headless gateway IP. The IP may appear only in server-side local configuration,
never in tracked source or browser output.

- [ ] **Step 4: Commit**

```bash
git add README.md docs
git commit -m "docs: describe stateless web demo agent"
```

### Task 10: Vercel environment and dual deployment

**Files:** No source files unless deployment verification exposes a defect.

- [ ] **Step 1: Add Vercel Production sensitive variables**

Add all server-only gateway variables plus a newly generated
`DEMO_SESSION_SECRET`. Do not add them to Preview unless a preview smoke test
is intentionally authorized.

- [ ] **Step 2: Create and verify a Vercel preview**

Deploy the tested commit, inspect status and logs, then call the public session,
agent, recommend and illustration routes.

- [ ] **Step 3: Configure route-specific Vercel Firewall limits**

Apply IP limits for Agent, recommendation and illustration. If the connector
requires GUI-only confirmation, stop only for that exact action and provide the
three rule definitions.

- [ ] **Step 4: Merge/push the tested branch**

Push the tested source state so Vercel Git Integration and Retinbox GitHub
Action deploy the same commit.

- [ ] **Step 5: Verify both production URLs**

Use a real browser to validate:

```text
https://fridge-elf-app.vercel.app/demo
https://fridgeelf.rth1.xyz/demo
```

Check live Agent, recommendation, image, fallback, CORS, CSP and browser storage.

