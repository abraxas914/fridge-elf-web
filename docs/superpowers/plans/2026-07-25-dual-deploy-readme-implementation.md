# Fridge Elf Dual Deploy and README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every `main` push independently update Vercel and Retinbox, add lightweight CI, and replace the root README with a visual product-and-engineering handoff.

**Architecture:** Vercel owns its production deployment through native Git Integration while the existing GitHub Action owns the Retinbox mirror. A small Playwright script captures deterministic README screenshots from the local SPA and hands them to ImageMagick for fixed-size WebP output; the README consumes only committed static assets.

**Tech Stack:** GitHub Actions, Vercel Git Integration, Retinbox deploy action, Node.js 22, Playwright, ImageMagick, React/Vite, GitHub Markdown.

---

## File map

- Create `.github/workflows/ci.yml`: repository checks for pull requests and `main`.
- Modify `.gitignore`: exclude local `.superpowers/` design-session state and screenshot scratch PNGs.
- Create `scripts/readme-capture-config.mjs`: pure route, viewport, selector, and output definitions.
- Create `scripts/readme-capture-config.node-test.mjs`: validate capture contract without launching a browser.
- Create `scripts/capture-readme-assets.mjs`: deterministic Playwright capture plus ImageMagick conversion.
- Create `docs/readme/landing-hero.webp`: desktop Hero screenshot.
- Create `docs/readme/food-lifecycle.webp`: desktop lifecycle screenshot.
- Create `docs/readme/mobile-demo.webp`: mobile app screenshot.
- Modify `README.md`: product-first presentation, engineering handoff, release state, and deployment diagram.

### Task 1: Make the README capture contract testable

**Files:**
- Create: `scripts/readme-capture-config.mjs`
- Create: `scripts/readme-capture-config.node-test.mjs`
- Modify: `package.json`

- [x] **Step 1: Write the failing contract test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { captures, resolveBaseUrl } from './readme-capture-config.mjs'

test('defines the three committed README assets', () => {
  assert.deepEqual(
    captures.map(({ name, width, height }) => ({ name, width, height })),
    [
      { name: 'landing-hero', width: 1440, height: 900 },
      { name: 'food-lifecycle', width: 1440, height: 900 },
      { name: 'mobile-demo', width: 412, height: 915 },
    ],
  )
})

test('defaults to the documented local preview origin', () => {
  assert.equal(resolveBaseUrl(undefined), 'http://127.0.0.1:4173')
})
```

- [x] **Step 2: Run the test and verify it fails**

Run:

```bash
node --test scripts/readme-capture-config.node-test.mjs
```

Expected: FAIL because `readme-capture-config.mjs` does not exist.

- [x] **Step 3: Add the minimal capture configuration**

```js
export function resolveBaseUrl(value) {
  return (value?.trim() || 'http://127.0.0.1:4173').replace(/\/+$/, '')
}

export const captures = [
  {
    name: 'landing-hero',
    route: '/',
    width: 1440,
    height: 900,
    waitFor: '#landing-hero-title',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  },
  {
    name: 'food-lifecycle',
    route: '/#lifecycle',
    width: 1440,
    height: 900,
    waitFor: '#lifecycle-title',
    element: '.landing-lifecycle',
  },
  {
    name: 'mobile-demo',
    route: '/demo',
    width: 412,
    height: 915,
    waitFor: 'main',
    clip: { x: 0, y: 0, width: 412, height: 915 },
  },
]
```

Add this package script:

```json
"capture:readme": "node scripts/capture-readme-assets.mjs"
```

- [x] **Step 4: Run the contract test**

Run:

```bash
node --test scripts/readme-capture-config.node-test.mjs
```

Expected: 2 tests pass.

- [x] **Step 5: Commit**

```bash
git add package.json scripts/readme-capture-config.mjs scripts/readme-capture-config.node-test.mjs
git commit -m "test: define readme capture contract"
```

### Task 2: Implement deterministic screenshot generation

**Files:**
- Create: `scripts/capture-readme-assets.mjs`
- Modify: `.gitignore`

- [x] **Step 1: Extend the test with filesystem-safe output expectations**

Add:

```js
test('uses WebP filenames below docs/readme', () => {
  for (const capture of captures) {
    assert.match(capture.name, /^[a-z0-9-]+$/)
    assert.ok(capture.route.startsWith('/'))
  }
})
```

- [x] **Step 2: Run the test**

Run:

```bash
node --test scripts/readme-capture-config.node-test.mjs
```

Expected: 3 tests pass.

- [x] **Step 3: Implement the browser and conversion script**

The script must:

1. import `chromium` from `@playwright/test`;
2. check `magick -version` with `spawnSync`;
3. create `docs/readme/.capture-tmp`;
4. launch Chromium with `channel: 'chromium'`;
5. mock `/api/releases/latest` with the stable JSON needed by the Landing Page;
6. wait for `document.fonts.ready`, disable animations, and capture each configured route;
7. convert each PNG using:

```bash
magick input.png -strip -quality 82 output.webp
```

8. fail if an output is missing, has an unexpected pixel size, or exceeds 500 KB;
9. close the browser in `finally`;
10. leave temporary PNGs in place when conversion fails so the failure can be inspected.

Add to `.gitignore`:

```text
.superpowers/
docs/readme/.capture-tmp/
```

- [ ] **Step 4: Run the local generator**

With the app on port 4173:

```bash
npm run capture:readme
```

Expected: three WebPs in `docs/readme/`, each at the configured dimensions and under 500 KB.

- [x] **Step 5: Commit**

```bash
git add .gitignore scripts/capture-readme-assets.mjs scripts/readme-capture-config.node-test.mjs docs/readme
git commit -m "feat: generate deterministic readme screenshots"
```

### Task 3: Add lightweight repository CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [x] **Step 1: Create the CI workflow**

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm run test:rth-html
```

- [x] **Step 2: Validate YAML structure and repository scripts**

Run:

```bash
npx --yes prettier@3.6.2 --check .github/workflows/ci.yml
npm test
npm run build
npm run test:rth-html
```

Expected: formatting and all checks pass.

- [x] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: verify pull requests and main"
```

### Task 4: Rebuild README as product and engineering handoff

**Files:**
- Modify: `README.md`
- Read: `docs/WEB_PREVIEW_SPEC.md`
- Read: `docs/readme/landing-hero.webp`
- Read: `docs/readme/food-lifecycle.webp`
- Read: `docs/readme/mobile-demo.webp`

- [x] **Step 1: Write the product-first top half**

Use centered HTML for:

- `FRIDGE ELF`
- `让冰箱里的每一份食材，都有始有终。`
- a restrained summary of the physical-data problem;
- CI, Retinbox deploy, and MIT badges;
- links to `/demo`, Vercel, and the custom domain.

Embed the desktop Hero screenshot, then explain the problem and lifecycle in short Chinese paragraphs. Include the exact flow:

```text
买回家 → 被记录 → 被照看 → 变成一餐 → 缺货采购 → 再次入库
```

- [x] **Step 2: Write the engineering handoff**

Add:

- capability/value table;
- mobile screenshot;
- local install, test, build, and e2e commands;
- API route table;
- BYOK and server-side key boundary;
- current Android state: Pre-release Debug only;
- stable `vX.Y.Z` APK naming convention;
- Mermaid dual-deploy diagram;
- one-time setup versus daily push instructions;
- explicit statement that Retinbox is a static mirror and does not run Vercel Functions.

- [x] **Step 3: Check links, headings, and forbidden marketing language**

Run:

```bash
rg -n "颠覆|革命性|重新定义|TBD|TODO" README.md
rg -n "fridge-elf-app.vercel.app|fridgeelf.rth1.xyz|/demo|docs/readme/.*webp" README.md
```

Expected: first command has no matches; second command shows all public entry points and all three assets.

- [x] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: redesign project readme"
```

### Task 5: Verify locally, connect Vercel Git, and publish

**Files:**
- Verify: all committed files
- External configuration: Vercel project `fridge-elf`

- [ ] **Step 1: Run the complete local quality gate**

```bash
node --test scripts/readme-capture-config.node-test.mjs
npm test
npm run build
npm run test:rth-html
npm run e2e
git diff --check
```

Expected: all tests pass, the build succeeds, and no whitespace errors are reported.

- [x] **Step 2: Verify screenshot metadata**

```bash
magick identify docs/readme/*.webp
du -k docs/readme/*.webp
```

Expected: 1440×900, 1440×900, and 412×915; each file is below 500 KB.

- [x] **Step 3: Connect the existing Vercel project once**

Run from a clean clone linked to Vercel project `fridge-elf`:

```bash
npx --yes vercel@latest git connect https://github.com/abraxas914/fridge-elf-web
```

Expected: Vercel confirms the repository connection without creating a new project or secret.

- [ ] **Step 4: Push `main` and observe both publishers**

```bash
git push origin main
gh run list --branch main --limit 10
npx --yes vercel@latest ls fridge-elf
```

Expected: `CI` and `Deploy Retinbox mirror` run for the pushed SHA, and Vercel creates a production deployment from the same SHA.

- [ ] **Step 5: Verify production behavior**

Check:

- `https://fridge-elf-app.vercel.app`
- `https://fridge-elf-app.vercel.app/demo`
- `https://fridgeelf.rth1.xyz`
- `https://fridgeelf.rth1.xyz/demo`

Expected: both hosts render the current Landing Page and Demo; the Vercel host retains server API support, while the custom host remains the independent static mirror.

- [x] **Step 6: Record implementation completion**

Update the checkboxes in this plan, add a concise deployment result below this task, and commit:

```bash
git add docs/superpowers/plans/2026-07-25-dual-deploy-readme-implementation.md
git commit -m "docs: record dual deploy verification"
```

## Execution record

Completed locally on 2026-07-25:

- Capture contract: 3 Node tests passed.
- Application tests: 25 files and 96 tests passed.
- TypeScript, API typecheck, and Vite production build passed.
- Retinbox HTML test passed.
- CI workflow parsed successfully as YAML.
- README product copy, engineering handoff, links, and three visual assets were committed.
- Assets verified at `1440×900`, `1440×900`, and `412×915`; all are below 500 KB.

Environment-limited checks:

- `npm run e2e` could not start its local server because the execution sandbox rejected `127.0.0.1:4173` with `EPERM`; no browser assertion ran or failed.
- `npm run capture:readme` reached the same browser/process sandbox boundary. The committed desktop visuals were rendered from the repository's current design tokens and illustration language; the mobile visual reuses the repository's Darwin visual-regression baseline.

External deployment progress:

- Pushed `fd4b11376e779df43b61dd79013d32fff1d79aed` to `main`.
- `CI` run `30159209806` completed successfully.
- `Deploy Retinbox mirror` run `30159209811` completed successfully.
- Re-linked the working directory to the existing `suyc417-5032s-projects/fridge-elf` project; no duplicate project was created.
- Connected `https://github.com/abraxas914/fridge-elf-web` through Vercel Git Integration.
- A subsequent `main` push is required to validate that all three publishers trigger from the same new SHA.
