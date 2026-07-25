# Fridge Elf Recipe Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved image-only recipe showcase to the Fridge Elf Landing Page and publish it through both deployment channels.

**Architecture:** A neutral `images`-only configuration feeds a focused `RecipeShowcase` component. The component owns desktop scroll progress, active-image presentation, reduced-motion fallback, mobile native scrolling, and the existing `/demo` CTA; `LandingPage` only places it in the narrative. Static assets and legal records are copied without exposing attribution or internal names in UI configuration.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Playwright, Vite, Vercel, Retinbox.

---

## File map

- Create `src/landing/recipeShowcase.ts`: neutral public image configuration.
- Create `src/landing/recipeShowcase.test.ts`: configuration contract.
- Create `src/landing/recipeShowcaseMotion.ts`: pure scroll-progress mapping.
- Create `src/landing/recipeShowcaseMotion.test.ts`: progress boundary tests.
- Create `src/landing/RecipeShowcase.tsx`: showcase markup, active state, scroll listener, CTA.
- Create `src/landing/RecipeShowcase.test.tsx`: component behavior and accessibility.
- Create `src/landing/RecipeShowcase.css`: desktop stack, sticky stage, mobile carousel, reduced motion.
- Modify `src/LandingPage.tsx`: place the showcase after capabilities and pass `openDemo`.
- Modify `src/LandingPage.test.tsx`: lock approved copy and absence of restricted presentation metadata.
- Modify `tests/e2e/landing-motion.spec.ts`: desktop progression, reduced motion, and mobile overflow.
- Copy eight WebP files to `public/assets/recipe/`.
- Copy attribution and license to `docs/legal/recipe-illustrations/`.

### Task 1: Neutral assets and configuration

**Files:**
- Create: `src/landing/recipeShowcase.ts`
- Create: `src/landing/recipeShowcase.test.ts`
- Create: `public/assets/recipe/recipe-sample-01.webp`
- Create: `public/assets/recipe/recipe-sample-01@2x.webp`
- Create: `public/assets/recipe/recipe-sample-02.webp`
- Create: `public/assets/recipe/recipe-sample-02@2x.webp`
- Create: `public/assets/recipe/recipe-sample-03.webp`
- Create: `public/assets/recipe/recipe-sample-03@2x.webp`
- Create: `public/assets/recipe/recipe-sample-04.webp`
- Create: `public/assets/recipe/recipe-sample-04@2x.webp`
- Create: `docs/legal/recipe-illustrations/ATTRIBUTION.md`
- Create: `docs/legal/recipe-illustrations/LICENSE-IAN-MIT.txt`

- [ ] **Step 1: Write the failing configuration test**

```ts
import { describe, expect, it } from 'vitest'
import { recipeShowcase } from './recipeShowcase'

describe('recipeShowcase', () => {
  it('exposes only four neutral image paths', () => {
    expect(Object.keys(recipeShowcase)).toEqual(['images'])
    expect(recipeShowcase.images).toEqual([
      '/assets/recipe/recipe-sample-01.webp',
      '/assets/recipe/recipe-sample-02.webp',
      '/assets/recipe/recipe-sample-03.webp',
      '/assets/recipe/recipe-sample-04.webp',
    ])
    expect(JSON.stringify(recipeShowcase)).not.toMatch(
      /name|style|description|tag|skill|小黑/i,
    )
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/landing/recipeShowcase.test.ts`

Expected: FAIL because `./recipeShowcase` does not exist.

- [ ] **Step 3: Add the minimal configuration**

```ts
export const recipeShowcase = {
  images: [
    '/assets/recipe/recipe-sample-01.webp',
    '/assets/recipe/recipe-sample-02.webp',
    '/assets/recipe/recipe-sample-03.webp',
    '/assets/recipe/recipe-sample-04.webp',
  ],
} as const
```

- [ ] **Step 4: Copy only approved assets and legal files**

Run:

```bash
mkdir -p public/assets/recipe docs/legal/recipe-illustrations
cp /Users/ethan/workspace/projects/recipe-landing-assets-20260726/landing/recipe-sample-*.webp public/assets/recipe/
cp /Users/ethan/workspace/projects/recipe-landing-assets-20260726/ATTRIBUTION.md docs/legal/recipe-illustrations/
cp /Users/ethan/workspace/projects/recipe-landing-assets-20260726/LICENSE-IAN-MIT.txt docs/legal/recipe-illustrations/
```

Expected: eight WebP files and two Legal files exist; no `cards/`, `source/`, `raw/`, or Contact Sheet is copied.

- [ ] **Step 5: Run the test and verify GREEN**

Run: `npm test -- src/landing/recipeShowcase.test.ts`

Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add src/landing/recipeShowcase.ts src/landing/recipeShowcase.test.ts public/assets/recipe docs/legal/recipe-illustrations
git commit -m "feat: add neutral recipe showcase assets"
```

### Task 2: Deterministic scroll progression

**Files:**
- Create: `src/landing/recipeShowcaseMotion.ts`
- Create: `src/landing/recipeShowcaseMotion.test.ts`

- [ ] **Step 1: Write failing boundary tests**

```ts
import { describe, expect, it } from 'vitest'
import { getRecipeShowcaseIndex } from './recipeShowcaseMotion'

describe('getRecipeShowcaseIndex', () => {
  it.each([
    [-1, 1],
    [0, 1],
    [0.24, 1],
    [0.25, 0],
    [0.5, 2],
    [0.75, 3],
    [1, 3],
    [2, 3],
  ])('maps progress %s to image %s', (progress, imageIndex) => {
    expect(getRecipeShowcaseIndex(progress)).toBe(imageIndex)
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/landing/recipeShowcaseMotion.test.ts`

Expected: FAIL because `getRecipeShowcaseIndex` does not exist.

- [ ] **Step 3: Implement the approved order**

```ts
const sequence = [1, 0, 2, 3] as const

export function getRecipeShowcaseIndex(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress))
  const stage = Math.min(sequence.length - 1, Math.floor(clamped * 4))
  return sequence[stage]
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- src/landing/recipeShowcaseMotion.test.ts`

Expected: all eight cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/landing/recipeShowcaseMotion.ts src/landing/recipeShowcaseMotion.test.ts
git commit -m "feat: map recipe showcase scroll progress"
```

### Task 3: Accessible showcase component

**Files:**
- Create: `src/landing/RecipeShowcase.tsx`
- Create: `src/landing/RecipeShowcase.test.tsx`
- Create: `src/landing/RecipeShowcase.css`

- [ ] **Step 1: Write failing component tests**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecipeShowcase } from './RecipeShowcase'

describe('RecipeShowcase', () => {
  it('renders image-only recipe output with the second image active', () => {
    render(<RecipeShowcase />)
    expect(
      screen.getByRole('heading', {
        name: '把做饭这件事，画得更简单。',
      }),
    ).toBeVisible()
    expect(screen.getByText('从食材到上桌，一眼看懂。')).toBeVisible()
    expect(screen.getAllByRole('img')).toHaveLength(4)
    expect(screen.getByTestId('recipe-showcase-image-2')).toHaveAttribute(
      'data-active',
      'true',
    )
    expect(document.body).not.toHaveTextContent(/风格|Skill|小黑/)
  })

  it('switches the active image and keeps the demo link same-origin', () => {
    const onOpenDemo = vi.fn()
    render(<RecipeShowcase onOpenDemo={onOpenDemo} />)
    fireEvent.click(
      screen.getByRole('button', {
        name: '查看番茄炒蛋食谱插画示例 4',
      }),
    )
    expect(screen.getByTestId('recipe-showcase-image-4')).toHaveAttribute(
      'data-active',
      'true',
    )
    fireEvent.click(screen.getByRole('link', { name: '开始制作' }))
    expect(onOpenDemo).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: '开始制作' })).toHaveAttribute(
      'href',
      '/demo',
    )
  })
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- src/landing/RecipeShowcase.test.tsx`

Expected: FAIL because `RecipeShowcase` does not exist.

- [ ] **Step 3: Implement markup and state**

Implement `RecipeShowcase.tsx` with:

```tsx
const [activeIndex, setActiveIndex] = useState(1)
const sectionRef = useRef<HTMLElement>(null)

const getRetinaSource = (source: string) =>
  source.replace(/\.webp$/, '@2x.webp')
```

Render one semantic section, one text block, four figures from `recipeShowcase.images`, four dot buttons, and an `/demo` link. Each image uses:

```tsx
<img
  src={source}
  srcSet={`${source} 600w, ${getRetinaSource(source)} 1200w`}
  sizes="(max-width: 767px) 78vw, 31vw"
  width="1200"
  height="1440"
  loading="lazy"
  decoding="async"
  alt={`番茄炒蛋食谱插画示例 ${index + 1}`}
/>
```

Add a passive `scroll` listener and `resize` listener. Schedule one `requestAnimationFrame`; calculate:

```ts
const rectangle = sectionRef.current.getBoundingClientRect()
const scrollRange = Math.max(1, rectangle.height - window.innerHeight)
const progress = Math.min(1, Math.max(0, -rectangle.top / scrollRange))
setActiveIndex(getRecipeShowcaseIndex(progress))
```

Skip scroll-driven updates when `(max-width: 767px)` or `(prefers-reduced-motion: reduce)` matches. Remove listeners and cancel the pending frame on unmount.

- [ ] **Step 4: Add approved layout CSS**

Implement:

- `.recipe-showcase { min-height: 240svh; }`
- `.recipe-showcase-stage { position: sticky; top: 0; min-height: 100svh; }`
- left copy, right active image, three smaller absolute echoes along the lower edge
- `data-active="true"` main image treatment
- transform-only transitions using `cubic-bezier(0.16, 1, 0.3, 1)`
- no text overlays, gradient overlays, auto animation, or layout-property animation
- at `max-width: 767px`, reset height/sticky/absolute positioning and use `display:flex; overflow-x:auto; scroll-snap-type:x mandatory`
- at reduced motion, remove transitions

- [ ] **Step 5: Run the tests and verify GREEN**

Run: `npm test -- src/landing/RecipeShowcase.test.tsx src/landing/recipeShowcaseMotion.test.ts`

Expected: all tests pass without unhandled animation errors.

- [ ] **Step 6: Commit**

```bash
git add src/landing/RecipeShowcase.tsx src/landing/RecipeShowcase.test.tsx src/landing/RecipeShowcase.css
git commit -m "feat: add recipe showcase interaction"
```

### Task 4: Landing integration

**Files:**
- Modify: `src/LandingPage.tsx`
- Modify: `src/LandingPage.test.tsx`

- [ ] **Step 1: Write the failing Landing integration assertions**

Add assertions:

```tsx
expect(
  screen.getByRole('heading', {
    name: '把做饭这件事，画得更简单。',
  }),
).toBeVisible()
expect(screen.getByText('从食材到上桌，一眼看懂。')).toBeVisible()
expect(screen.getByRole('link', { name: '开始制作' })).toHaveAttribute(
  'href',
  '/demo',
)
expect(document.body).not.toHaveTextContent(/风格|Skill|小黑/)
```

- [ ] **Step 2: Run the Landing test and verify RED**

Run: `npm test -- src/LandingPage.test.tsx`

Expected: FAIL because the new section is absent.

- [ ] **Step 3: Insert the component**

Import `RecipeShowcase` and render:

```tsx
<RecipeShowcase onOpenDemo={openDemo} />
```

Place it after `.landing-capabilities` and before the `why` section. Do not add a Header navigation label.

- [ ] **Step 4: Run the Landing and component tests**

Run: `npm test -- src/LandingPage.test.tsx src/landing/RecipeShowcase.test.tsx`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/LandingPage.tsx src/LandingPage.test.tsx
git commit -m "feat: place recipe showcase in landing story"
```

### Task 5: Browser behavior and responsive regression

**Files:**
- Modify: `tests/e2e/landing-motion.spec.ts`

- [ ] **Step 1: Add browser assertions**

Add tests that:

- route `/api/releases/latest` to the existing fixture
- visit `/`
- scroll the showcase from top to bottom and assert active indices `2 → 1 → 3 → 4`
- emulate reduced motion and assert scrolling does not change the default second image
- test widths `360`, `412`, and `480`, assert `.recipe-showcase-gallery` has `overflow-x: auto`, and assert `document.documentElement.scrollWidth === window.innerWidth`
- assert each showcase image has computed `object-fit: contain`

- [ ] **Step 2: Run the focused E2E test and verify failures**

Run: `npx playwright test tests/e2e/landing-motion.spec.ts`

Expected: new assertions fail until selectors, scroll geometry, and mobile CSS are correct.

- [ ] **Step 3: Correct only observable defects**

Adjust `RecipeShowcase.tsx` and `RecipeShowcase.css` so the approved desktop sequence, reduced-motion behavior, mobile peek, and no-overflow conditions match the browser.

- [ ] **Step 4: Run the focused E2E test and verify GREEN**

Run: `npx playwright test tests/e2e/landing-motion.spec.ts`

Expected: all Landing motion tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/landing-motion.spec.ts src/landing/RecipeShowcase.tsx src/landing/RecipeShowcase.css
git commit -m "test: verify recipe showcase motion"
```

### Task 6: Full verification and deployment

**Files:**
- Modify only if verification reveals an in-scope defect.

- [ ] **Step 1: Verify static contracts**

Run:

```bash
git diff --check
rg -n "xiaohei|watercolor|linen|pixel-person|Skill|小黑" src public/assets/recipe
```

Expected: `git diff --check` exits 0; restricted terms return no matches.

- [ ] **Step 2: Run all automated checks**

Run:

```bash
npm test
npm run build
npm run e2e
npm run test:rth-html
npm run build:rth
```

Expected: all unit, production build, E2E, and Retinbox checks pass.

- [ ] **Step 3: Inspect the working tree**

Run: `git status --short`

Expected: only the user's pre-existing untracked QR files remain; do not stage them.

- [ ] **Step 4: Push `main`**

Run: `git push origin main`

Expected: the new commits reach `abraxas914/fridge-elf-web`.

- [ ] **Step 5: Verify both deployment channels**

Run:

```bash
gh run list --repo abraxas914/fridge-elf-web --branch main --limit 4
curl -fsSL https://fridge-elf-app.vercel.app/ | rg "Fridge Elf · 冰箱精灵"
```

Expected: CI and Retinbox deploy conclude successfully; Vercel serves the current Fridge Elf Landing shell. If the custom host blocks CLI requests with 403, use the successful Retinbox workflow as the deployment signal and report the host-protection limitation.

