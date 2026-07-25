# Landing Hardware Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one color-graded real Fridge Elf prototype photo to the Home AIoT section and reveal it from the current device-sync illustration with safe static fallbacks.

**Architecture:** A neutral config owns the selected path. `HardwareProofVisual` owns image load state and renders the current SVG and photo as two layers. `LandingPage` places the component; `LandingPage.css` owns the desktop reveal, mobile stacking, image-error fallback, and reduced-motion behavior.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Playwright, bundled Sharp

---

## File map

- Create `src/landing/hardwareShowcase.ts`
- Create `src/landing/hardwareShowcase.test.ts`
- Create `src/landing/HardwareProofVisual.tsx`
- Create `src/landing/HardwareProofVisual.test.tsx`
- Create `public/assets/hardware/fridge-elf-prototype-01-v1.webp`
- Modify `src/LandingPage.tsx`
- Modify `src/LandingPage.css`
- Modify `src/LandingPage.test.tsx`
- Modify `tests/e2e/landing-motion.spec.ts`

### Task 1: Add the approved image config and asset

**Files:**
- Create: `src/landing/hardwareShowcase.test.ts`
- Create: `src/landing/hardwareShowcase.ts`
- Create: `public/assets/hardware/fridge-elf-prototype-01-v1.webp`

- [ ] **Step 1: Write the failing config test**

```ts
import { describe, expect, it } from 'vitest'
import { hardwareShowcase } from './hardwareShowcase'

describe('hardwareShowcase', () => {
  it('keeps only the approved versioned prototype image', () => {
    expect(hardwareShowcase).toEqual({
      images: ['/assets/hardware/fridge-elf-prototype-01-v1.webp'],
    })
    expect(Object.keys(hardwareShowcase)).toEqual(['images'])
  })
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npx vitest run src/landing/hardwareShowcase.test.ts
```

Expected: FAIL because `./hardwareShowcase` does not exist.

- [ ] **Step 3: Add the minimal config**

```ts
export const hardwareShowcase = {
  images: ['/assets/hardware/fridge-elf-prototype-01-v1.webp'],
} as const
```

- [ ] **Step 4: Produce the graded WebP**

Create `public/assets/hardware`, then run:

```bash
NODE_PATH=/Users/ethan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/ethan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
-e "const sharp=require('sharp'); sharp('/var/folders/3p/1wcfpj6j07l7xgdrw1j570800000gn/T/codex-clipboard-ec9eb360-effe-4100-8bf1-bd14644c4d80.png').modulate({brightness:1.03,saturation:0.72}).linear(0.97,4).webp({quality:88,effort:5}).toFile('public/assets/hardware/fridge-elf-prototype-01-v1.webp')"
```

Expected: a 1434 × 1070 WebP preserving the original composition.

- [ ] **Step 5: Verify GREEN and commit**

```bash
npx vitest run src/landing/hardwareShowcase.test.ts
git add src/landing/hardwareShowcase.ts src/landing/hardwareShowcase.test.ts public/assets/hardware/fridge-elf-prototype-01-v1.webp
git commit -m "feat: add landing hardware prototype asset"
```

Expected: the test passes and only the config, test, and approved asset are committed.

### Task 2: Build a load-safe proof component

**Files:**
- Create: `src/landing/HardwareProofVisual.test.tsx`
- Create: `src/landing/HardwareProofVisual.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HardwareProofVisual } from './HardwareProofVisual'

describe('HardwareProofVisual', () => {
  it('renders the approved lazy image with stable dimensions', () => {
    render(<HardwareProofVisual />)
    const image = screen.getByRole('img', {
      name: '同时运行 Fridge Elf 的手机端与冰箱硬件终端原型',
    })

    expect(image).toHaveAttribute(
      'src',
      '/assets/hardware/fridge-elf-prototype-01-v1.webp',
    )
    expect(image).toHaveAttribute('width', '1434')
    expect(image).toHaveAttribute('height', '1070')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('decoding', 'async')
    expect(screen.getByTestId('hardware-proof')).toHaveAttribute(
      'data-photo-ready',
      'false',
    )
  })

  it('reveals only a loaded photo and records image failure', () => {
    render(<HardwareProofVisual />)
    const image = screen.getByRole('img', {
      name: '同时运行 Fridge Elf 的手机端与冰箱硬件终端原型',
    })
    const proof = screen.getByTestId('hardware-proof')

    fireEvent.load(image)
    expect(proof).toHaveAttribute('data-photo-ready', 'true')
    expect(proof).toHaveAttribute('data-photo-failed', 'false')

    fireEvent.error(image)
    expect(proof).toHaveAttribute('data-photo-ready', 'false')
    expect(proof).toHaveAttribute('data-photo-failed', 'true')
    expect(
      screen.getByRole('img', {
        name: '冰箱旁的小屏与手机共享同一份库存',
      }),
    ).toBeVisible()
  })
})
```

- [ ] **Step 2: Verify RED**

```bash
npx vitest run src/landing/HardwareProofVisual.test.tsx
```

Expected: FAIL because `HardwareProofVisual` does not exist.

- [ ] **Step 3: Implement the minimal component**

```tsx
import { useState } from 'react'
import { DeviceSyncSvg } from './illustrations/DeviceSyncSvg'
import { hardwareShowcase } from './hardwareShowcase'

const prototypeAlt =
  '同时运行 Fridge Elf 的手机端与冰箱硬件终端原型'

export function HardwareProofVisual() {
  const [photoState, setPhotoState] = useState<
    'loading' | 'ready' | 'failed'
  >('loading')

  return (
    <figure
      className="landing-hardware-proof"
      data-photo-ready={photoState === 'ready'}
      data-photo-failed={photoState === 'failed'}
      data-testid="hardware-proof"
    >
      <div className="landing-hardware-diagram">
        <DeviceSyncSvg />
      </div>
      <div className="landing-hardware-photo-frame">
        <img
          className="landing-hardware-photo"
          src={hardwareShowcase.images[0]}
          width="1434"
          height="1070"
          loading="lazy"
          decoding="async"
          alt={prototypeAlt}
          onLoad={() => setPhotoState('ready')}
          onError={() => setPhotoState('failed')}
        />
        <figcaption>
          手机端与冰箱终端，共享同一份正在流动的库存。
        </figcaption>
      </div>
    </figure>
  )
}
```

- [ ] **Step 4: Verify GREEN and commit**

```bash
npx vitest run src/landing/HardwareProofVisual.test.tsx
git add src/landing/HardwareProofVisual.tsx src/landing/HardwareProofVisual.test.tsx
git commit -m "feat: add load-safe hardware proof visual"
```

Expected: 2 tests pass.

### Task 3: Integrate the proof into Home AIoT

**Files:**
- Modify: `src/LandingPage.test.tsx`
- Modify: `src/LandingPage.tsx`

- [ ] **Step 1: Add the failing integration assertion**

Add `within` to the Testing Library import. Inside the lifecycle-story test, after the Home AIoT heading assertion, add:

```tsx
const iotSection = document.querySelector('#iot')
expect(iotSection).not.toBeNull()
expect(
  within(iotSection as HTMLElement).getByRole('img', {
    name: '同时运行 Fridge Elf 的手机端与冰箱硬件终端原型',
  }),
).toBeVisible()
```

- [ ] **Step 2: Verify RED**

```bash
npx vitest run src/LandingPage.test.tsx
```

Expected: FAIL because the approved photo is not in `#iot`.

- [ ] **Step 3: Replace the direct SVG**

Replace:

```tsx
import { DeviceSyncSvg } from './landing/illustrations/DeviceSyncSvg'
```

with:

```tsx
import { HardwareProofVisual } from './landing/HardwareProofVisual'
```

Replace:

```tsx
<DeviceSyncSvg />
```

inside `.landing-iot-visual` with:

```tsx
<HardwareProofVisual />
```

- [ ] **Step 4: Verify GREEN and commit**

```bash
npx vitest run src/LandingPage.test.tsx
git add src/LandingPage.tsx src/LandingPage.test.tsx
git commit -m "feat: place hardware proof in home iot story"
```

Expected: all Landing tests pass.

### Task 4: Add reveal, mobile, and reduced-motion behavior

**Files:**
- Modify: `tests/e2e/landing-motion.spec.ts`
- Modify: `src/LandingPage.css`

- [ ] **Step 1: Add failing E2E coverage**

Append:

```ts
test('desktop hardware proof uses the approved layered composition', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await stubMissingRelease(page)
  await page.goto('/')

  const proof = page.getByTestId('hardware-proof')
  const photo = page.getByRole('img', {
    name: '同时运行 Fridge Elf 的手机端与冰箱硬件终端原型',
  })
  await proof.scrollIntoViewIfNeeded()
  await expect(photo).toHaveJSProperty('complete', true)
  await expect(proof).toHaveAttribute('data-photo-ready', 'true')

  const composition = await proof.evaluate((element) => {
    const diagram = element.querySelector('.landing-hardware-diagram')
    const frame = element.querySelector('.landing-hardware-photo-frame')
    const image = element.querySelector('.landing-hardware-photo')
    if (
      !(diagram instanceof HTMLElement) ||
      !(frame instanceof HTMLElement) ||
      !(image instanceof HTMLElement)
    ) {
      throw new Error('hardware proof unavailable')
    }
    return {
      display: getComputedStyle(element).display,
      diagramArea: getComputedStyle(diagram).gridArea,
      frameArea: getComputedStyle(frame).gridArea,
      border: getComputedStyle(frame).borderTopWidth,
      filter: getComputedStyle(image).filter,
      fit: getComputedStyle(image).objectFit,
    }
  })

  expect(composition.display).toBe('grid')
  expect(composition.diagramArea).toBe(composition.frameArea)
  expect(composition.border).toBe('3px')
  expect(composition.filter).not.toBe('none')
  expect(composition.fit).toBe('contain')
})

test('mobile hardware proof stacks without widening the page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await stubMissingRelease(page)
  await page.goto('/')

  const proof = page.getByTestId('hardware-proof')
  await proof.scrollIntoViewIfNeeded()
  await expect(proof).toHaveAttribute('data-photo-ready', 'true')

  const geometry = await proof.evaluate((element) => {
    const diagram = element.querySelector('.landing-hardware-diagram')
    const frame = element.querySelector('.landing-hardware-photo-frame')
    const image = element.querySelector('.landing-hardware-photo')
    if (
      !(diagram instanceof HTMLElement) ||
      !(frame instanceof HTMLElement) ||
      !(image instanceof HTMLElement)
    ) {
      throw new Error('hardware proof unavailable')
    }
    return {
      diagramBottom: diagram.getBoundingClientRect().bottom,
      frameTop: frame.getBoundingClientRect().top,
      fit: getComputedStyle(image).objectFit,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }
  })

  expect(geometry.frameTop).toBeGreaterThanOrEqual(geometry.diagramBottom - 1)
  expect(geometry.fit).toBe('contain')
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth)
})

test('reduced motion removes hardware reveal transitions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await stubMissingRelease(page)
  await page.goto('/')

  const proof = page.getByTestId('hardware-proof')
  await proof.scrollIntoViewIfNeeded()
  await expect(proof).toHaveAttribute('data-photo-ready', 'true')

  const durations = await proof.evaluate((element) => {
    const diagram = element.querySelector('.landing-hardware-diagram')
    const frame = element.querySelector('.landing-hardware-photo-frame')
    if (!(diagram instanceof HTMLElement) || !(frame instanceof HTMLElement)) {
      throw new Error('hardware proof unavailable')
    }
    return {
      diagram: getComputedStyle(diagram).transitionDuration,
      frame: getComputedStyle(frame).transitionDuration,
    }
  })

  expect(durations).toEqual({ diagram: '0s', frame: '0s' })
})
```

- [ ] **Step 2: Verify RED**

```bash
npx playwright test tests/e2e/landing-motion.spec.ts --grep "hardware"
```

Expected: FAIL on the missing grid, border, filter, and `object-fit` styles.

- [ ] **Step 3: Add the exact desktop styles**

```css
.landing-hardware-proof {
  position: relative;
  display: grid;
  margin: 0;
  isolation: isolate;
}

.landing-hardware-diagram,
.landing-hardware-photo-frame {
  grid-area: 1 / 1;
  min-width: 0;
}

.landing-hardware-diagram {
  z-index: 1;
  transition:
    opacity 420ms var(--ease-out),
    transform 700ms var(--ease-out);
}

.landing-hardware-photo-frame {
  position: relative;
  z-index: 2;
  align-self: center;
  overflow: hidden;
  opacity: 0;
  background: var(--panel-3);
  border: var(--border-card) solid var(--border);
  box-shadow: var(--shadow-card);
  clip-path: inset(8% 10%);
  transform: translateY(14px) scale(0.985);
  transition:
    clip-path 700ms var(--ease-out),
    opacity 520ms var(--ease-out),
    transform 700ms var(--ease-out);
}

.landing-hardware-photo-frame::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background: rgb(235 220 180 / 8%);
  mix-blend-mode: color;
}

.landing-hardware-photo {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1434 / 1070;
  object-fit: contain;
  filter: brightness(1.02) saturate(0.86) contrast(0.97);
}

.landing-hardware-photo-frame figcaption {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 1;
  max-width: calc(100% - 24px);
  padding: 8px 10px;
  color: var(--text);
  font-size: 12px;
  line-height: 1.5;
  background: rgb(251 243 219 / 92%);
  border: var(--border-thin) solid var(--border);
}

.landing-reveal[data-visible="true"]
  .landing-hardware-proof[data-photo-ready="true"]
  .landing-hardware-diagram {
  opacity: 0;
  transform: translateY(-8px) scale(0.99);
}

.landing-reveal[data-visible="true"]
  .landing-hardware-proof[data-photo-ready="true"]
  .landing-hardware-photo-frame {
  opacity: 1;
  clip-path: inset(0);
  transform: none;
}
```

- [ ] **Step 4: Add exact mobile and reduced-motion fallbacks**

Inside `@media (max-width: 800px)`:

```css
.landing-hardware-proof {
  gap: 18px;
}

.landing-hardware-diagram,
.landing-hardware-photo-frame {
  grid-area: auto;
}

.landing-hardware-diagram,
.landing-reveal[data-visible="true"]
  .landing-hardware-proof[data-photo-ready="true"]
  .landing-hardware-diagram {
  opacity: 1;
  transform: none;
}

.landing-hardware-photo-frame,
.landing-reveal[data-visible="true"]
  .landing-hardware-proof[data-photo-ready="true"]
  .landing-hardware-photo-frame {
  opacity: 1;
  clip-path: inset(0);
  transform: none;
}

.landing-hardware-proof[data-photo-failed="true"]
  .landing-hardware-photo-frame {
  display: none;
}
```

Inside `@media (prefers-reduced-motion: reduce)`:

```css
.landing-hardware-diagram,
.landing-hardware-photo-frame {
  transition: none !important;
  transform: none !important;
}
```

- [ ] **Step 5: Verify GREEN and inspect**

```bash
npx playwright test tests/e2e/landing-motion.spec.ts --grep "hardware"
```

Expected: all hardware tests pass.

Open the generated WebP and capture `#iot` at 1440 × 900 and 390 × 844. Keep the transition only if the photo reads more naturally than a static stack; otherwise remove the layered selectors and retain the tested static stack allowed by the approved spec.

- [ ] **Step 6: Commit**

```bash
git add src/LandingPage.css tests/e2e/landing-motion.spec.ts
git commit -m "feat: reveal real hardware in landing iot section"
```

### Task 5: Verify the whole repository

**Files:**
- Modify only files required to fix regressions introduced above.

- [ ] **Step 1: Run all required verification**

```bash
npm test
npm run build
npm run test:rth-html
npm run e2e
```

Expected: every command exits 0 with no failures.

- [ ] **Step 2: Review scope**

```bash
git diff HEAD~4 --check
git status --short --branch
```

Expected: implementation commits contain only the approved hardware config, component, asset, integration, styles, and tests. The existing untracked QR files, QR generator, and handoff document remain untouched.
