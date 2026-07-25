# Web Demo v1.0.0 Release Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale Web Demo product implementation with the exact Fridge Elf `v1.0.0@50364b2` product surface while preserving the stateless Vercel Agent/Image2 gateway and removing all browser BYOK UI.

**Architecture:** Vendor the released Android WebView product source as the UI and state-machine baseline, record its origin in a machine-readable lock, and keep Web-only behavior behind injected runtime ports. A fresh in-memory store is created for every `/demo` mount; text and image requests use the existing Vercel BFF, while Retinbox remains a static client of the same BFF.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Playwright, Vercel Functions, Node.js 22.

---

## File ownership map

Upstream-owned product files are synchronized from
`fridge_app@v1.0.0:apps/android/web/src`:

```text
src/app/
src/bridge/
src/catalog/
src/components/
src/features/
src/fixtures/
src/scenes/
src/styles/
```

Web-owned files remain in this repository:

```text
src/RootApp.tsx
src/LandingPage.tsx
src/ai/
src/demo/
src/landing/
src/release/
api/
scripts/
vercel.json
rth-host.json
```

Declared Web overrides are limited to:

```text
src/App.tsx
src/app/ports.ts
src/app/recipes.ts
src/app/state.ts
src/bridge/browserMock.ts
src/components/AppHeader.tsx
src/components/AppShell.tsx
src/features/recipeIllustration/RecipeIllustrationPanel.tsx
src/scenes/profile/ProfileScene.tsx
src/scenes/recipe/AssistantAnswer.tsx
src/scenes/recipe/RecipeScene.tsx
```

### Task 1: Add the executable upstream baseline lock

**Files:**
- Create: `config/upstream-baseline.json`
- Create: `scripts/verify-upstream-baseline.mjs`
- Create: `scripts/upstream-baseline.node-test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing baseline tests**

Create `scripts/upstream-baseline.node-test.mjs`:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  validateBaseline,
  verifyBaselineFiles,
} from './verify-upstream-baseline.mjs'

const baseline = JSON.parse(
  await readFile(new URL('../config/upstream-baseline.json', import.meta.url)),
)

test('locks the released product baseline', () => {
  assert.deepEqual(
    {
      repository: baseline.repository,
      tag: baseline.tag,
      commit: baseline.commit,
      sourcePath: baseline.sourcePath,
    },
    {
      repository: 'https://github.com/YantingShen-dev/fridge_app.git',
      tag: 'v1.0.0',
      commit: '50364b2',
      sourcePath: 'apps/android/web',
    },
  )
  assert.deepEqual(validateBaseline(baseline), [])
})

test('contains only declared product overrides', async () => {
  const result = await verifyBaselineFiles(baseline)
  assert.deepEqual(result.errors, [])
  assert.equal(result.checkedFiles, 0)
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
node --test scripts/upstream-baseline.node-test.mjs
```

Expected: FAIL because the lock and verifier do not exist.

- [ ] **Step 3: Add the baseline lock**

Create `config/upstream-baseline.json`:

```json
{
  "repository": "https://github.com/YantingShen-dev/fridge_app.git",
  "tag": "v1.0.0",
  "commit": "50364b2",
  "sourcePath": "apps/android/web",
  "productRoots": [
    "src/app",
    "src/bridge",
    "src/catalog",
    "src/components",
    "src/features",
    "src/fixtures",
    "src/scenes",
    "src/styles"
  ],
  "allowedOverrides": [
    "src/App.tsx",
    "src/app/ports.ts",
    "src/app/recipes.ts",
    "src/app/state.ts",
    "src/bridge/browserMock.ts",
    "src/components/AppHeader.tsx",
    "src/components/AppShell.tsx",
    "src/features/recipeIllustration/RecipeIllustrationPanel.tsx",
    "src/scenes/profile/ProfileScene.tsx",
    "src/scenes/recipe/AssistantAnswer.tsx",
    "src/scenes/recipe/RecipeScene.tsx"
  ],
  "files": {}
}
```

- [ ] **Step 4: Implement the verifier**

Create `scripts/verify-upstream-baseline.mjs`:

```js
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const SHA = /^[0-9a-f]{7,40}$/i
const TAG = /^v\d+\.\d+\.\d+$/

export function validateBaseline(baseline) {
  const errors = []
  if (baseline.repository !== 'https://github.com/YantingShen-dev/fridge_app.git') {
    errors.push('unexpected upstream repository')
  }
  if (!TAG.test(baseline.tag ?? '')) errors.push('invalid semantic tag')
  if (!SHA.test(baseline.commit ?? '')) errors.push('invalid commit')
  if (baseline.sourcePath !== 'apps/android/web') errors.push('invalid source path')
  if (!Array.isArray(baseline.allowedOverrides)) errors.push('missing overrides')
  if (!baseline.files || typeof baseline.files !== 'object') errors.push('missing files')
  return errors
}

export async function verifyBaselineFiles(baseline, root = process.cwd()) {
  const errors = validateBaseline(baseline)
  const allowed = new Set(baseline.allowedOverrides)
  let checkedFiles = 0
  for (const [path, expected] of Object.entries(baseline.files ?? {})) {
    if (allowed.has(path)) continue
    try {
      const content = await readFile(resolve(root, path))
      const actual = createHash('sha256').update(content).digest('hex')
      checkedFiles += 1
      if (actual !== expected) errors.push(`upstream drift: ${path}`)
    } catch {
      errors.push(`missing upstream file: ${path}`)
    }
  }
  return { checkedFiles, errors }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const baseline = JSON.parse(
    await readFile(resolve('config/upstream-baseline.json'), 'utf8'),
  )
  const result = await verifyBaselineFiles(baseline)
  if (result.errors.length) {
    result.errors.forEach((error) => console.error(error))
    process.exitCode = 1
  } else {
    console.info(`Verified ${result.checkedFiles} upstream product files`)
  }
}
```

- [ ] **Step 5: Wire the checks into package scripts**

Add these entries to `package.json`:

```json
{
  "scripts": {
    "test:baseline": "node --test scripts/upstream-baseline.node-test.mjs && node scripts/verify-upstream-baseline.mjs"
  }
}
```

- [ ] **Step 6: Run the focused test**

Run:

```bash
npm run test:baseline
```

Expected: PASS with zero drift errors; zero checked files is allowed until Task 2 populates the digest map.

- [ ] **Step 7: Commit**

```bash
git add config/upstream-baseline.json scripts/verify-upstream-baseline.mjs scripts/upstream-baseline.node-test.mjs package.json
git commit -m "chore: lock web demo to v1 release"
```

### Task 2: Synchronize the released product source

**Files:**
- Replace from upstream: `src/app/`
- Replace from upstream: `src/bridge/`
- Replace from upstream: `src/catalog/`
- Replace from upstream: `src/components/`
- Create from upstream: `src/features/`
- Replace from upstream: `src/fixtures/`
- Replace from upstream: `src/scenes/`
- Replace from upstream: `src/styles/`
- Replace from upstream: `src/App.tsx`
- Modify: `config/upstream-baseline.json`
- Create: `scripts/refresh-upstream-baseline.mjs`

- [ ] **Step 1: Add a failing release-surface test**

Create `src/releaseBaseline.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

describe('v1 release product surface', () => {
  it('contains the released display, credentials, assistant and illustration modules', () => {
    const expected = [
      'src/scenes/display/DisplayScene.tsx',
      'src/scenes/recipe/FavoriteRecipesModal.tsx',
      'src/features/assistant/AssistantResult.tsx',
      'src/features/recipeIllustration/RecipeIllustrationPanel.tsx',
      'src/features/credentials/CredentialCenter.tsx',
    ]
    expected.forEach((path) => expect(existsSync(resolve(path)), path).toBe(true))
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- src/releaseBaseline.test.ts
```

Expected: FAIL because the released modules are absent.

- [ ] **Step 3: Export the exact release tree to a temporary directory**

Run:

```bash
baseline_tmp=$(mktemp -d)
git -C /Users/ethan/workspace/projects/hackathon/advx_2026_01 archive v1.0.0 apps/android/web/src | tar -x -C "$baseline_tmp"
```

Expected: `$baseline_tmp/apps/android/web/src` contains the released source.

- [ ] **Step 4: Synchronize the product roots**

Run these exact mechanical copies:

```bash
rsync -a --delete "$baseline_tmp/apps/android/web/src/app/" src/app/
rsync -a --delete "$baseline_tmp/apps/android/web/src/bridge/" src/bridge/
rsync -a --delete "$baseline_tmp/apps/android/web/src/catalog/" src/catalog/
rsync -a --delete "$baseline_tmp/apps/android/web/src/components/" src/components/
rsync -a --delete "$baseline_tmp/apps/android/web/src/features/" src/features/
rsync -a --delete "$baseline_tmp/apps/android/web/src/fixtures/" src/fixtures/
rsync -a --delete "$baseline_tmp/apps/android/web/src/scenes/" src/scenes/
rsync -a --delete "$baseline_tmp/apps/android/web/src/styles/" src/styles/
cp "$baseline_tmp/apps/android/web/src/App.tsx" src/App.tsx
```

Do not copy upstream `src/main.tsx`; this repository must keep `RootApp`.

- [ ] **Step 5: Add the deterministic digest refresh script**

Create `scripts/refresh-upstream-baseline.mjs`:

```js
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const lockPath = resolve('config/upstream-baseline.json')
const lock = JSON.parse(await readFile(lockPath, 'utf8'))
const allowed = new Set(lock.allowedOverrides)

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await filesUnder(path))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

const files = {}
for (const root of lock.productRoots) {
  for (const absolute of await filesUnder(resolve(root))) {
    const path = relative(process.cwd(), absolute)
    if (allowed.has(path)) continue
    const content = await readFile(absolute)
    files[path] = createHash('sha256').update(content).digest('hex')
  }
}

lock.files = Object.fromEntries(
  Object.entries(files).sort(([left], [right]) => left.localeCompare(right)),
)
await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`)
```

- [ ] **Step 6: Generate and verify the digest map**

Run:

```bash
node scripts/refresh-upstream-baseline.mjs
npm run test:baseline
```

Expected: PASS and at least 20 verified upstream files.

- [ ] **Step 7: Run the release-surface test**

Run:

```bash
npm test -- src/releaseBaseline.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit the mechanical baseline**

```bash
git add src/App.tsx src/app src/bridge src/catalog src/components src/features src/fixtures src/scenes src/styles src/releaseBaseline.test.ts config/upstream-baseline.json scripts/refresh-upstream-baseline.mjs
git commit -m "feat: synchronize demo with v1 product surface"
```

### Task 3: Make the released state machine session-only

**Files:**
- Create: `src/demo/memoryStorage.ts`
- Create: `src/demo/memoryStorage.test.ts`
- Modify: `src/app/ports.ts`
- Modify: `src/app/recipes.ts`
- Modify: `src/app/state.ts`
- Modify: `src/bridge/browserMock.ts`
- Modify: `src/scenes/profile/ProfileScene.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing memory-store tests**

Create `src/demo/memoryStorage.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createMemoryStorage } from './memoryStorage'

describe('DemoStateStore', () => {
  it('isolates each demo world', () => {
    const first = createMemoryStorage()
    first.setItem('fridge-profile-v1', '{"taste":"clean"}')
    const second = createMemoryStorage()
    expect(second.getItem('fridge-profile-v1')).toBeNull()
  })

  it('implements the Storage subset used by the released app', () => {
    const storage = createMemoryStorage()
    storage.setItem('key', 'value')
    expect(storage.getItem('key')).toBe('value')
    storage.removeItem('key')
    expect(storage.getItem('key')).toBeNull()
    storage.setItem('a', '1')
    storage.clear()
    expect(storage.getItem('a')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- src/demo/memoryStorage.test.ts
```

Expected: FAIL because `memoryStorage.ts` does not exist.

- [ ] **Step 3: Implement the in-memory store**

Create `src/demo/memoryStorage.ts`:

```ts
export type DemoStateStore = Pick<
  Storage,
  'clear' | 'getItem' | 'removeItem' | 'setItem'
>

export function createMemoryStorage(): DemoStateStore {
  const values = new Map<string, string>()
  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  }
}
```

- [ ] **Step 4: Inject storage into released loaders**

Change `src/app/recipes.ts` to:

```ts
export function loadFavoriteRecipes(
  storage: Pick<Storage, 'getItem'> = localStorage,
): SavedRecipe[] {
  try {
    const value: unknown = JSON.parse(
      storage.getItem('fridge-favorite-recipes-v1') ?? 'null',
    )
    if (Array.isArray(value)) return value as SavedRecipe[]
  } catch {
    // Fall through to the starter recipes.
  }
  return defaultFavoriteRecipes()
}
```

Change `src/app/state.ts` so `loadPlanner` is exported and injected:

```ts
export function loadPlanner(
  storage: Pick<Storage, 'getItem'> = localStorage,
): PlannerState {
  // Keep the released parser body and replace both localStorage reads with storage.
}

export function createInitialAppState(
  storage: Pick<Storage, 'getItem'> = localStorage,
): AppState {
  return {
    scene: 'kitchen',
    currentTab: 'fridge',
    modal: null,
    toast: null,
    muted: false,
    reducedMotion: false,
    displayMode: 'home',
    noteText: '',
    visibleNoteText: '',
    planner: loadPlanner(storage),
  }
}

export const initialAppState = createInitialAppState()
```

- [ ] **Step 5: Add storage to the runtime**

Add to `src/app/ports.ts`:

```ts
export type StateStoragePort = Pick<
  Storage,
  'clear' | 'getItem' | 'removeItem' | 'setItem'
>
```

Add `stateStorage: StateStoragePort` to `AppRuntime` in
`src/bridge/browserMock.ts`. The normal browser runtime may keep `localStorage`;
the Demo runtime added in Task 4 must supply `createMemoryStorage()`.

- [ ] **Step 6: Replace direct persistence in App and Profile**

In `src/App.tsx`:

```ts
const [favoriteRecipes, setFavoriteRecipes] =
  useState<SavedRecipe[]>(() => loadFavoriteRecipes(runtime.stateStorage))
const [state, dispatch] = useReducer(
  appReducer,
  runtime.stateStorage,
  (storage) => ({
    ...createInitialAppState(storage),
    reducedMotion:
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  }),
)

useEffect(() => {
  runtime.stateStorage.setItem(
    'fridge-favorite-recipes-v1',
    JSON.stringify(favoriteRecipes),
  )
}, [favoriteRecipes, runtime.stateStorage])

useEffect(() => {
  runtime.stateStorage.setItem(
    'fridge-planner-v2',
    JSON.stringify(state.planner),
  )
}, [runtime.stateStorage, state.planner])
```

Pass `storage={runtime.stateStorage}` to `ProfileScene`. Change
`ProfileScene` to use that prop in `loadProfile` and its save effect instead of
`localStorage`.

- [ ] **Step 7: Verify no product state uses browser persistence**

Run:

```bash
rg -n "localStorage|indexedDB" src/App.tsx src/app src/scenes src/demo
```

Expected: only default arguments used by the non-Demo runtime remain; Demo paths
use `runtime.stateStorage`.

- [ ] **Step 8: Run focused tests**

Run:

```bash
npm test -- src/demo/memoryStorage.test.ts src/app/state.test.ts src/App.test.tsx src/scenes/profile/ProfileScene.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/demo/memoryStorage.ts src/demo/memoryStorage.test.ts src/app/ports.ts src/app/recipes.ts src/app/state.ts src/bridge/browserMock.ts src/scenes/profile/ProfileScene.tsx src/App.tsx
git commit -m "feat: keep demo product state in memory"
```

### Task 4: Adapt the managed Agent and recommendation gateway

**Files:**
- Create: `src/demo/demoRuntime.ts`
- Create: `src/demo/demoRuntime.test.ts`
- Modify: `src/ai/types.ts`
- Modify: `src/ai/demoWorld.ts`
- Modify: `src/scenes/recipe/AssistantAnswer.tsx`
- Modify: `src/scenes/recipe/RecipeScene.tsx`
- Modify: `src/App.tsx`
- Modify: `src/RootApp.tsx`

- [ ] **Step 1: Write failing managed-runtime tests**

Create `src/demo/demoRuntime.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createDemoRuntime } from './demoRuntime'

describe('managed Web Demo runtime', () => {
  it('uses the shared Agent adapter without exposing credentials', async () => {
    const requester = vi.fn().mockResolvedValue({
      answer: '先做番茄鸡蛋。',
      suggestions: [{
        title: '番茄鸡蛋轻食碗',
        reason: '现有食材齐全',
        recipeId: 'recipe-tomato-egg-bowl',
      }],
    })
    const runtime = createDemoRuntime({ agentRequester: requester })
    const reply = await runtime.assistant.ask({ question: '今晚吃什么？' })
    expect(reply.answer).toContain('番茄鸡蛋')
    expect(reply.existingRecipeIds).toEqual(['recipe-tomato-egg-bowl'])
    expect(runtime.capabilities).toEqual({
      assistant: 'managed',
      recipeIllustration: 'managed',
    })
  })

  it('creates a fresh world for every runtime', async () => {
    const first = createDemoRuntime()
    await first.inventory.removeItem('food-tomato')
    const second = createDemoRuntime()
    expect(await second.inventory.getItems()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'food-tomato' })]),
    )
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- src/demo/demoRuntime.test.ts
```

Expected: FAIL because `createDemoRuntime` does not exist.

- [ ] **Step 3: Define the Web-only reply and capability types**

Add to `src/ai/types.ts`:

```ts
import type { AssistantReply } from '../bridge/types'

export interface DemoAssistantReply extends AssistantReply {
  existingRecipeIds: string[]
}

export interface DemoCapabilities {
  assistant: 'managed'
  recipeIllustration: 'managed'
}
```

- [ ] **Step 4: Implement the managed runtime**

Create `src/demo/demoRuntime.ts` with this public shape:

```ts
import { requestDemoAgent, requestDemoIllustration } from '../ai/demoApi'
import type { DemoAgentInput } from '../ai/types'
import {
  createBrowserMock,
  createBrowserDisplay,
  createBrowserSpeech,
} from '../bridge/browserMock'
import { createMemoryStorage } from './memoryStorage'

export interface DemoRuntimeOptions {
  agentRequester?: typeof requestDemoAgent
  illustrationRequester?: typeof requestDemoIllustration
}

export function createDemoRuntime(options: DemoRuntimeOptions = {}) {
  const stateStorage = createMemoryStorage()
  const agentRequester = options.agentRequester ?? requestDemoAgent
  const illustrationRequester =
    options.illustrationRequester ?? requestDemoIllustration

  return {
    mode: 'browser-mock' as const,
    stateStorage,
    inventory: createBrowserMock(stateStorage),
    capabilities: {
      assistant: 'managed' as const,
      recipeIllustration: 'managed' as const,
    },
    assistant: createManagedAssistant(agentRequester),
    recipeIllustration:
      createManagedIllustration(illustrationRequester),
    speech: createBrowserSpeech(),
    display: createBrowserDisplay(stateStorage),
  }
}
```

Implement `createManagedAssistant` in the same file so it:

1. receives the Release assistant context;
2. builds `DemoWorldSnapshot`;
3. calls `agentRequester({ mode: 'agent', message, snapshot })`;
4. returns `answer`, empty `recipes`, empty `shoppingItems`,
   `suggestShopping: false`, and validated `existingRecipeIds`;
5. uses the existing Fixture answer when the requester rejects.

Implement `recommend(snapshot)` on the returned adapter with
`mode: 'recommend'`.

- [ ] **Step 5: Compose Release answer UI with existing recipes**

Extend `AssistantAnswer` props:

```ts
interface AssistantAnswerProps {
  question: string
  reply: DemoAssistantReply
  existingRecipes: SavedRecipe[]
  onOpenRecipe: (recipe: SavedRecipe) => void
}
```

Render the released answer first, then:

```tsx
{existingRecipes.length ? (
  <div className="recipe-strip" aria-label="现有食谱建议">
    {existingRecipes.map((recipe) => (
      <RecipeMini
        key={recipe.id}
        recipe={recipe}
        label="AGENT PICK"
        onOpen={onOpenRecipe}
      />
    ))}
  </div>
) : null}
```

Do not render generated-recipe save or automatic shopping actions in Demo mode.

- [ ] **Step 6: Add the managed recommendation entry**

In `RecipeScene`, include a third tool only when `onOpenAi` is provided:

```ts
const tools = [
  { cls: 'a', icon: 'heart' as const, title: '个人收藏食谱', sub: 'FAVORITES', action: props.onOpenFavorites ?? fallback },
  { cls: 'b', icon: 'bot' as const, title: '今日推荐', sub: 'AI PICKS', action: props.onOpenAi },
  { cls: 'c', icon: 'calendar' as const, title: '周规划', sub: 'MEAL PLAN', action: props.onOpenPlanner },
].filter((tool) => tool.action)
```

Wire `onOpenAi` in App to `runtime.assistant.recommend(snapshot)` and show the
same read-only result modal.

- [ ] **Step 7: Make RootApp create and reset the runtime**

In `RootApp.tsx`:

```tsx
const [demoKey, setDemoKey] = useState(0)
const [demoRuntime, setDemoRuntime] = useState(() => createDemoRuntime())

const restartDemo = () => {
  demoRuntime.dispose?.()
  setDemoRuntime(createDemoRuntime())
  setDemoKey((current) => current + 1)
}

<DemoApp
  key={demoKey}
  inventoryRuntime={demoRuntime}
  onRestartDemo={restartDemo}
/>
```

Dispose the runtime on RootApp unmount.

- [ ] **Step 8: Run focused tests**

Run:

```bash
npm test -- src/demo/demoRuntime.test.ts src/ai/demoWorld.test.ts src/scenes/recipe/RecipeScene.test.tsx src/App.test.tsx src/RootApp.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/demo src/ai/types.ts src/ai/demoWorld.ts src/scenes/recipe/AssistantAnswer.tsx src/scenes/recipe/RecipeScene.tsx src/App.tsx src/RootApp.tsx
git commit -m "feat: adapt v1 demo to managed agent gateway"
```

### Task 5: Adapt the released Image2 job UI

**Files:**
- Create: `src/demo/managedIllustration.ts`
- Create: `src/demo/managedIllustration.test.ts`
- Modify: `src/features/recipeIllustration/RecipeIllustrationPanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing illustration job tests**

Create `src/demo/managedIllustration.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createManagedIllustration } from './managedIllustration'

describe('managed Image2 adapter', () => {
  it('converts every requested page into a released job result', async () => {
    const requester = vi.fn()
      .mockResolvedValueOnce(new Blob(['one'], { type: 'image/png' }))
      .mockResolvedValueOnce(new Blob(['two'], { type: 'image/png' }))
    const adapter = createManagedIllustration(requester, {
      createObjectURL: (blob) => `blob:${blob.size}`,
      revokeObjectURL: vi.fn(),
    })
    const job = await adapter.start({
      contractVersion: 1,
      recipe: {
        id: 'recipe',
        title: '测试食谱',
        ingredients: [{ name: '番茄' }],
        steps: Array.from({ length: 7 }, (_, index) => ({
          order: index + 1,
          action: `步骤 ${index + 1}`,
        })),
      },
      styleId: 'xiaohei',
    })
    expect(job.status).toBe('succeeded')
    expect(job.pages.map((page) => page.index)).toEqual([1, 2])
    expect(requester).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- src/demo/managedIllustration.test.ts
```

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the Image2 adapter**

Create `src/demo/managedIllustration.ts`. Export:

```ts
export function createManagedIllustration(
  requester = requestDemoIllustration,
  urls = {
    createObjectURL: URL.createObjectURL.bind(URL),
    revokeObjectURL: URL.revokeObjectURL.bind(URL),
  },
): RecipeIllustrationPort & { dispose(): void }
```

The implementation must:

- call `buildRecipeIllustrationPlan(request.recipe)` when `pageIndexes` is absent;
- request pages in ascending order with `{ ...request, pageIndexes: [index] }`;
- create one Blob URL per successful page;
- return a terminal `succeeded` job when all pages succeed;
- return `failed` with completed pages preserved when any page fails;
- store jobs in a `Map`;
- revoke replaced, removed, and disposed URLs.

- [ ] **Step 4: Replace the Credential gate**

Change `RecipeIllustrationPanel` props from:

```ts
credentials: CredentialPort
onConfigure: () => void
```

to:

```ts
managed: boolean
```

Remove the credential-loading effect and unconfigured branch. The released
style selector, job progress, results, retry, download and error UI remain
unchanged.

Update `RecipeDetailModal` and App to pass `managed`.

- [ ] **Step 5: Verify BYOK UI is unreachable**

Run:

```bash
rg -n "CredentialCenter|密钥配置|去配置|providerId|baseUrl" src/App.tsx src/RootApp.tsx src/scenes src/features/recipeIllustration src/demo
```

Expected: no production import or visible BYOK copy; credential source may remain
as an unimported upstream file.

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- src/demo/managedIllustration.test.ts src/features/recipeIllustration/RecipeIllustrationPanel.test.tsx src/scenes/recipe/RecipeDetailModal.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/demo/managedIllustration.ts src/demo/managedIllustration.test.ts src/features/recipeIllustration/RecipeIllustrationPanel.tsx src/features/recipeIllustration/RecipeIllustrationPanel.test.tsx src/scenes/recipe/RecipeDetailModal.tsx src/scenes/recipe/RecipeDetailModal.test.tsx src/App.tsx
git commit -m "feat: adapt v1 illustration UI to managed Image2"
```

### Task 6: Remove BYOK Profile UI and restore Demo reset controls

**Files:**
- Modify: `src/scenes/profile/ProfileScene.tsx`
- Modify: `src/scenes/profile/ProfileScene.test.tsx`
- Modify: `src/components/AppHeader.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/AppShell.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing Profile and reset tests**

Add to `ProfileScene.test.tsx`:

```tsx
it('keeps product preferences without exposing BYOK configuration', () => {
  render(<ProfileScene storage={createMemoryStorage()} />)
  expect(screen.getByText('居住模式')).toBeVisible()
  expect(screen.getByText('口味偏好')).toBeVisible()
  expect(screen.getByText('病史 / 过敏源 / 忌口')).toBeVisible()
  expect(screen.queryByText('密钥配置')).not.toBeInTheDocument()
  expect(screen.queryByText(/智能助手与食谱插画/)).not.toBeInTheDocument()
})
```

Add to `AppShell.test.tsx`:

```tsx
it('offers a deterministic demo restart action', async () => {
  const onRestartDemo = vi.fn()
  renderShell({ onRestartDemo })
  await userEvent.click(screen.getByRole('button', { name: '重新开始 Demo' }))
  expect(onRestartDemo).toHaveBeenCalledOnce()
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm test -- src/scenes/profile/ProfileScene.test.tsx src/components/AppShell.test.tsx
```

Expected: FAIL because credentials are visible and the released header lacks restart.

- [ ] **Step 3: Remove the Profile credential entry**

Delete `CredentialCenter`, credential summary state, credential effects, and the
credential entry card from `ProfileScene`. Keep every released preference
section and use the injected `storage`.

- [ ] **Step 4: Restore the restart control as a declared Web override**

Add optional `onRestartDemo` through `App`, `AppShell`, and `AppHeader`.
Render:

```tsx
{onRestartDemo ? (
  <button
    className="restart-demo-btn"
    type="button"
    onClick={onRestartDemo}
  >
    重新开始 Demo
  </button>
) : null}
```

Reuse the existing `.restart-demo-btn` styles from the pre-migration Web Demo.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- src/scenes/profile/ProfileScene.test.tsx src/components/AppShell.test.tsx src/App.test.tsx src/RootApp.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/profile/ProfileScene.tsx src/scenes/profile/ProfileScene.test.tsx src/components/AppHeader.tsx src/components/AppShell.tsx src/components/AppShell.css src/App.tsx
git commit -m "feat: remove byok from public demo"
```

### Task 7: Add baseline and end-to-end acceptance coverage

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `tests/e2e/life-helper.spec.ts`
- Modify: `tests/e2e/visual.spec.ts`
- Modify: `tests/e2e/helpers/appDriver.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

- [ ] **Step 1: Add the complete state-machine unit journey**

Add one App test that asserts:

```tsx
expect(screen.getByRole('tab', { name: '购物' })).toBeVisible()
expect(screen.getByRole('tab', { name: '食谱' })).toBeVisible()
expect(screen.getByRole('tab', { name: '冰箱' })).toBeVisible()
expect(screen.getByRole('tab', { name: '显示屏' })).toBeVisible()
expect(screen.getByRole('tab', { name: '我的' })).toBeVisible()
```

Then exercise one representative state change in each tab and assert
`onRestartDemo` remounts the Golden Fixture.

- [ ] **Step 2: Add the public Demo browser journey**

Update `life-helper.spec.ts` to cover:

```ts
test('runs the complete stateless v1 demo journey', async ({ page }) => {
  await page.goto('/demo')
  await page.getByRole('button', { name: /跳过/ }).click()
  await expect(page.getByText('BROWSER MOCK')).toBeVisible()
  await page.getByRole('tab', { name: '食谱' }).click()
  await expect(page.getByText('个人收藏食谱')).toBeVisible()
  await expect(page.getByText('今日推荐')).toBeVisible()
  await expect(page.getByText('周规划')).toBeVisible()
  await page.getByRole('tab', { name: '显示屏' }).click()
  await expect(page.getByText('冰箱显示屏')).toBeVisible()
  await page.getByRole('tab', { name: '我的' }).click()
  await expect(page.getByText('居住模式')).toBeVisible()
  await expect(page.getByText('密钥配置')).toHaveCount(0)
})
```

Mock `/api/demo/session`, `/api/demo/agent`, `/api/demo/recommend`, and
`/api/illustrate` at the browser boundary so CI remains deterministic.

- [ ] **Step 3: Add live-host parameterization**

Allow the same non-mutating smoke journey to run with:

```text
PLAYWRIGHT_BASE_URL=https://fridge-elf-app.vercel.app
PLAYWRIGHT_BASE_URL=https://fridgeelf.rth1.xyz
```

The live smoke must not call Image2 automatically; it verifies navigation,
absence of BYOK, anonymous session availability, and one rate-limited Agent
request only when `LIVE_AI=1`.

- [ ] **Step 4: Add baseline verification to CI**

Add before the build in `.github/workflows/ci.yml`:

```yaml
      - run: npm run test:baseline
      - run: npm test
      - run: npm run build
      - run: npm run build:rth
      - run: npm run test:rth-html
```

- [ ] **Step 5: Update README architecture**

Document:

```text
Demo product baseline: fridge_app v1.0.0@50364b2
State: per-page in-memory world
Agent/Image2: managed Vercel BFF
Browser BYOK: intentionally unavailable
```

- [ ] **Step 6: Run the complete local verification**

Run:

```bash
npm run test:baseline
npm test
npm run build
npm run build:rth
npm run test:rth-html
npm run e2e
```

Expected: all checks pass.

- [ ] **Step 7: Inspect both production bundles for secrets**

Run:

```bash
rg -n "113\\.45\\.39\\.247|api\\.iotwq\\.top|sk-[A-Za-z0-9]" dist
```

Expected: no matches.

- [ ] **Step 8: Commit**

```bash
git add src/App.test.tsx tests/e2e .github/workflows/ci.yml README.md
git commit -m "test: verify stateless v1 demo journey"
```

### Task 8: Integrate, deploy, and verify both public URLs

**Files:**
- No new source files expected

- [ ] **Step 1: Rebase on the latest Web main**

```bash
git fetch origin
git rebase origin/main
```

Expected: no unresolved conflicts; all prior task commits remain present.

- [ ] **Step 2: Repeat the release gate**

```bash
npm run test:baseline
npm test
npm run build
npm run build:rth
npm run test:rth-html
npm run e2e
```

Expected: all checks pass after rebase.

- [ ] **Step 3: Push the implementation branch**

```bash
git push -u origin feat/web-demo-v1-release-baseline
```

- [ ] **Step 4: Merge using the repository’s accepted direct-main workflow**

After reviewing the branch diff:

```bash
git checkout main
git pull --ff-only
git merge --ff-only feat/web-demo-v1-release-baseline
git push origin main
```

Expected: both deployment systems start from the same main commit.

- [ ] **Step 5: Wait for CI and Retinbox deployment**

Verify the GitHub Actions runs for the merged commit:

```text
CI: success
Deploy Retinbox mirror: success
```

- [ ] **Step 6: Verify the Vercel deployment commit**

Build locally and compare the production asset names in `/demo` with
`dist/index.html`. Expected: Vercel assets match the merged source build.

- [ ] **Step 7: Run the two live smoke journeys**

```bash
PLAYWRIGHT_BASE_URL=https://fridge-elf-app.vercel.app npm run e2e -- --grep "public demo smoke"
PLAYWRIGHT_BASE_URL=https://fridgeelf.rth1.xyz npm run e2e -- --grep "public demo smoke"
```

Expected on both hosts:

- released five-tab UI is visible;
- inventory batch and display scenes load;
- Profile has no BYOK UI;
- Agent session endpoint is available;
- restart restores the Golden Fixture.

- [ ] **Step 8: Record the verified commit**

Append the merged commit and both successful deployment URLs to README’s
deployment section, then commit:

```bash
git add README.md
git commit -m "docs: record verified v1 demo deployment"
git push origin main
```

## Plan self-review

- Spec coverage: Tasks 1–2 lock and import the Release baseline; Tasks 3 and 6
  enforce session-only state and remove BYOK; Tasks 4–5 adapt Agent,
  recommendation and Image2; Tasks 7–8 cover local and dual-host acceptance.
- Scope: Android, firmware, MQTT and the independent Release metadata failure
  remain outside this plan.
- Type consistency: `DemoStateStore`, `DemoCapabilities`,
  `DemoAssistantReply`, `createDemoRuntime`, and
  `createManagedIllustration` are introduced before later consumers.
- Safety: the existing root checkout’s untracked QR assets and generator script
  are never staged by a broad `git add`.
