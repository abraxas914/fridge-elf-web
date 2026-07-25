# AI Recipe Illustration Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth recipe tool that accepts either an existing recipe or pasted recipe text and produces exactly one image through the existing frontend illustration port.

**Architecture:** Keep all new behavior in the React frontend. Normalize both input modes into the existing `RecipeIllustrationRecipe` type, add an opt-in single-image mode to the shared panel, and wire a new modal through `App`; do not change `api/**`, Vercel configuration, or environment variables.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, existing `RecipeIllustrationPort`

---

### Task 1: Parse pasted recipes in the frontend

**Files:**
- Create: `src/scenes/recipe/pastedRecipe.ts`
- Create: `src/scenes/recipe/pastedRecipe.test.ts`

- [ ] **Step 1: Write failing parser tests**

Add tests that demonstrate a standard recipe, bullet steps, missing sections, and compression to six steps:

```ts
import { describe, expect, it } from 'vitest'
import { parsePastedRecipe } from './pastedRecipe'

describe('parsePastedRecipe', () => {
  it('parses a pasted title, ingredients, and numbered steps', () => {
    expect(parsePastedRecipe(`番茄炒蛋
食材
- 番茄 2个
- 鸡蛋 3个
步骤
1. 番茄切块
2. 鸡蛋炒熟
3. 合炒调味`)).toMatchObject({
      title: '番茄炒蛋',
      ingredients: [
        { name: '番茄', amount: '2个' },
        { name: '鸡蛋', amount: '3个' },
      ],
      steps: [
        { order: 1, action: '番茄切块' },
        { order: 2, action: '鸡蛋炒熟' },
        { order: 3, action: '合炒调味' },
      ],
    })
  })

  it('accepts bullet items inside a steps section', () => {
    expect(parsePastedRecipe(`凉拌黄瓜
材料
黄瓜 1根
做法
- 拍碎黄瓜
- 加入调味料
- 拌匀装盘`).steps).toHaveLength(3)
  })

  it('rejects text without ingredients and steps', () => {
    expect(() => parsePastedRecipe('只有一句描述')).toThrow(
      '请粘贴包含菜名、食材和步骤的食谱',
    )
  })

  it('compresses more than six steps without dropping source text', () => {
    const recipe = parsePastedRecipe(`测试菜
食材
- 食材 1份
步骤
1. 动作一
2. 动作二
3. 动作三
4. 动作四
5. 动作五
6. 动作六
7. 动作七`)
    expect(recipe.steps).toHaveLength(6)
    expect(recipe.steps.map((step) => step.action).join('；'))
      .toContain('动作七')
  })
})
```

- [ ] **Step 2: Run the parser test and verify RED**

Run:

```bash
npx vitest run src/scenes/recipe/pastedRecipe.test.ts
```

Expected: FAIL because `pastedRecipe.ts` does not exist.

- [ ] **Step 3: Implement the minimal parser**

Create a frontend-only parser that:

- trims lines and removes common Markdown bullets;
- treats the first non-empty line as title;
- detects ingredient headings with `/^(食材|材料|用料)/`;
- detects step headings with `/^(步骤|做法|制作方法)/`;
- accepts numbered steps or bullet lines inside the step section;
- separates a trailing amount with common Chinese units;
- evenly groups more than six source steps into six ordered actions;
- returns a `RecipeIllustrationRecipe` with a session-local id.

The exported API is:

```ts
export function parsePastedRecipe(source: string): RecipeIllustrationRecipe
```

- [ ] **Step 4: Run the parser test and verify GREEN**

Run:

```bash
npx vitest run src/scenes/recipe/pastedRecipe.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/recipe/pastedRecipe.ts src/scenes/recipe/pastedRecipe.test.ts
git commit -m "feat: parse pasted recipes for illustration"
```

### Task 2: Add opt-in single-image behavior

**Files:**
- Modify: `src/features/recipeIllustration/RecipeIllustrationPanel.tsx`
- Modify: `src/features/recipeIllustration/RecipeIllustrationPanel.test.tsx`

- [ ] **Step 1: Write the failing single-image test**

Render the panel with `singleImage`, click generate, and assert the existing port receives one page:

```tsx
render(
  <RecipeIllustrationPanel
    recipe={RECIPE}
    managed
    illustration={port}
    singleImage
  />,
)
fireEvent.click(screen.getByRole('button', { name: '生成食谱插画' }))
await waitFor(() =>
  expect(port.start).toHaveBeenCalledWith({
    contractVersion: 1,
    recipe: RECIPE,
    styleId: 'xiaohei',
    pageIndexes: [1],
  }),
)
expect(screen.queryByText('第 1 页')).not.toBeInTheDocument()
```

Keep the existing test that expects no `pageIndexes` when `singleImage` is absent.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx vitest run src/features/recipeIllustration/RecipeIllustrationPanel.test.tsx
```

Expected: FAIL because `singleImage` is not a valid property and the request has no page index.

- [ ] **Step 3: Implement single-image mode**

Add:

```ts
singleImage?: boolean
```

When true:

- initial generate calls `start([1])`;
- retry calls `start([1])`;
- progress text is `正在生成食谱插画`;
- result caption omits page numbering;
- save and regenerate controls remain available.

Default remains `false`, preserving the recipe-detail behavior.

- [ ] **Step 4: Run panel tests and verify GREEN**

Run:

```bash
npx vitest run src/features/recipeIllustration/RecipeIllustrationPanel.test.tsx
```

Expected: all panel tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/recipeIllustration/RecipeIllustrationPanel.tsx src/features/recipeIllustration/RecipeIllustrationPanel.test.tsx
git commit -m "feat: support single recipe illustration output"
```

### Task 3: Build the two-input illustration studio

**Files:**
- Create: `src/scenes/recipe/RecipeIllustrationStudioModal.tsx`
- Create: `src/scenes/recipe/RecipeIllustrationStudioModal.test.tsx`
- Modify: `src/scenes/recipe/RecipeScene.css`

- [ ] **Step 1: Write failing studio interaction tests**

Cover these observable behaviors:

```tsx
render(
  <RecipeIllustrationStudioModal
    recipes={RECIPES}
    illustration={illustration}
    managed
  />,
)

expect(screen.getByRole('button', { name: '选择食谱' }))
  .toHaveAttribute('aria-pressed', 'true')
fireEvent.click(screen.getByRole('button', { name: /番茄鸡蛋轻食碗/ }))
fireEvent.click(screen.getByRole('button', { name: '生成食谱插画' }))
await waitFor(() =>
  expect(illustration.start).toHaveBeenCalledWith(
    expect.objectContaining({
      pageIndexes: [1],
      recipe: expect.objectContaining({ title: '番茄鸡蛋轻食碗' }),
    }),
  ),
)
```

Then switch to paste mode, paste a valid recipe, generate it, and assert its title is sent. Add a separate test proving invalid text shows the inline parsing error and does not call `illustration.start`.

- [ ] **Step 2: Run studio tests and verify RED**

Run:

```bash
npx vitest run src/scenes/recipe/RecipeIllustrationStudioModal.test.tsx
```

Expected: FAIL because the modal component does not exist.

- [ ] **Step 3: Implement the studio**

The component props are:

```ts
interface RecipeIllustrationStudioModalProps {
  recipes: readonly Recipe[]
  illustration: RecipeIllustrationPort
  managed: boolean
}
```

Implement:

- two `aria-pressed` source-mode buttons;
- preset recipe choices using the existing recipe visual language;
- a labeled textarea with a complete example placeholder;
- inline validation using `parsePastedRecipe`;
- `RecipeIllustrationPanel` keyed by the normalized recipe identity and rendered with `singleImage`;
- no storage calls and no direct fetch calls.

Add focused CSS classes to `RecipeScene.css` for the source switcher, selected recipe, textarea, hint, and validation error.

- [ ] **Step 4: Run studio tests and verify GREEN**

Run:

```bash
npx vitest run src/scenes/recipe/RecipeIllustrationStudioModal.test.tsx
```

Expected: all studio tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/recipe/RecipeIllustrationStudioModal.tsx src/scenes/recipe/RecipeIllustrationStudioModal.test.tsx src/scenes/recipe/RecipeScene.css
git commit -m "feat: add recipe illustration studio modal"
```

### Task 4: Wire the fourth tile and App modal

**Files:**
- Modify: `src/scenes/recipe/RecipeScene.tsx`
- Modify: `src/scenes/recipe/RecipeScene.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write the failing fourth-tile test**

Pass `onOpenIllustration`, assert all four tools render, and click the new tile:

```tsx
const onOpenIllustration = vi.fn()
render(
  <RecipeScene
    onOpenPlanner={vi.fn()}
    onOpenFavorites={vi.fn()}
    onOpenAi={vi.fn()}
    onOpenIllustration={onOpenIllustration}
    onOpenAgent={vi.fn(async () => undefined)}
    onToast={vi.fn()}
  />,
)
expect(screen.getAllByRole('button', {
  name: /个人收藏食谱|今日推荐|周规划|AI 食谱插画/,
})).toHaveLength(4)
fireEvent.click(screen.getByRole('button', { name: /AI 食谱插画/ }))
expect(onOpenIllustration).toHaveBeenCalledOnce()
```

Add an App-level assertion that opening the tile displays the source buttons and paste textarea.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npx vitest run src/scenes/recipe/RecipeScene.test.tsx src/App.test.tsx
```

Expected: FAIL because the fourth callback, tool, and modal branch do not exist.

- [ ] **Step 3: Implement the wiring**

In `RecipeScene`:

```ts
onOpenIllustration?: () => void
```

Append:

```ts
{
  cls: 'd',
  icon: 'camera',
  title: 'AI 食谱插画',
  sub: 'IMAGE2',
  action: props.onOpenIllustration,
}
```

In `App`:

- import `RecipeIllustrationStudioModal`;
- add a `recipe-illustration` modal branch;
- pass `favoriteRecipes`, `runtime.recipeIllustration`, and `runtime.mode === 'browser-mock'`;
- pass an `onOpenIllustration` callback to `RecipeScene`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run src/scenes/recipe/RecipeScene.test.tsx src/App.test.tsx
```

Expected: focused tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/recipe/RecipeScene.tsx src/scenes/recipe/RecipeScene.test.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: expose AI recipe illustration tool"
```

### Task 5: Verify frontend-only scope and release safety

**Files:**
- Verify only; no planned production file changes.

- [ ] **Step 1: Run the complete test suite**

```bash
npm test -- --run
```

Expected: all test files and tests PASS.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: TypeScript checks and Vite build complete with exit code 0.

- [ ] **Step 3: Verify backend files are untouched**

```bash
git diff ae90c00 --name-only -- api vercel.json
```

Expected: no output.

- [ ] **Step 4: Review the final diff**

```bash
git status --short
git diff ae90c00 --stat
git log --oneline ae90c00..HEAD
```

Expected: only the specification, plan, React frontend, CSS, and frontend tests are present.

- [ ] **Step 5: Commit any verification-only documentation correction**

Only if the plan or specification needed a factual correction:

```bash
git add docs/superpowers
git commit -m "docs: align illustration studio verification"
```

