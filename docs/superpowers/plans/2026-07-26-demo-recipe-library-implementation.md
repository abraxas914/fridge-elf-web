# Web Demo Recipe Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 50 curated, category-complete recipes and colorful ingredient icons to the Web Demo, with one searchable picker shared by favorites, weekly planning, and AI illustration.

**Architecture:** Keep `SavedRecipe` and the current localStorage keys, but add optional category, structured ingredient, and source fields. Store the 50 curated records in a focused static catalog module, merge canonical seeds by stable ID at load time, and route details, shopping, planning, and illustration through the structured fields with legacy fallbacks. A reusable `RecipeCatalogPicker` owns search/category/selection UI while each parent owns its final action.

**Tech Stack:** React 19, TypeScript 5.9, Vitest, Testing Library, Vite, static inline SVG.

---

### Task 1: Add the canonical recipe schema and 50 curated seeds

**Files:**
- Create: `src/fixtures/demoRecipeCatalog.ts`
- Create: `src/fixtures/demoRecipeCatalog.test.ts`
- Modify: `src/app/recipes.ts`
- Modify: `src/fixtures/goldenFixture.ts`

- [ ] **Step 1: Write the failing data-contract test**

Create tests that import `DEMO_RECIPE_CATEGORIES` and `DEMO_RECIPE_SEEDS`, then assert:

```ts
expect(DEMO_RECIPE_CATEGORIES).toHaveLength(15)
expect(DEMO_RECIPE_SEEDS).toHaveLength(50)
expect(new Set(DEMO_RECIPE_SEEDS.map((recipe) => recipe.id)).size).toBe(50)
expect(new Set(DEMO_RECIPE_SEEDS.map((recipe) => recipe.category))).toEqual(
  new Set(DEMO_RECIPE_CATEGORIES),
)

for (const recipe of DEMO_RECIPE_SEEDS) {
  expect(recipe.id).toMatch(/^recipe-[a-z0-9-]+$/)
  expect(recipe.source).toBe('seed')
  expect(recipe.ingredients.length).toBeGreaterThan(0)
  expect(recipe.steps.length).toBeGreaterThanOrEqual(3)
  expect(recipe.steps.length).toBeLessThanOrEqual(8)
}
```

Add a shipped-content scan that assembles the prohibited source-brand phrase from separate tokens and rejects HTML, external URLs, supplier copy, and marketing fields without putting that phrase into production data.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- --run src/fixtures/demoRecipeCatalog.test.ts
```

Expected: FAIL because `demoRecipeCatalog.ts` does not exist.

- [ ] **Step 3: Add incremental recipe types**

In `src/app/recipes.ts`, define and export:

```ts
export const RECIPE_CATEGORIES = [
  '主食', '凉拌', '卤菜', '早餐', '汤',
  '炒菜', '炖菜', '炸品', '烤类', '烫菜',
  '煮锅', '砂锅菜', '蒸菜', '配料', '饮品',
] as const

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number]

export interface RecipeIngredient {
  key?: FoodKey
  name: string
  amount?: string
}
```

Extend `SavedRecipe` with:

```ts
category?: RecipeCategory
ingredients?: readonly RecipeIngredient[]
source?: 'seed' | 'user' | 'assistant'
```

- [ ] **Step 4: Add the curated static catalog**

Create `src/fixtures/demoRecipeCatalog.ts` exporting the 15 categories and exactly the 50 recipes listed in the approved design. Each record must:

- use a stable kebab-case `recipe-*` ID;
- use a valid current `FoodKey` or `unknown` hero key;
- contain the source category, concise rewritten Chinese title and English label;
- use `kcal: null` and `time: 0` when source facts do not establish them;
- provide structured ingredients with amounts only when present in source;
- provide 3–8 concise, rewritten steps without invented heat/time/doneness;
- set `source: 'seed'`;
- omit images, URLs, HTML, supplier information, product wording, and source branding.

Use the source Markdown only as a factual reference. Do not import source files or fetch GitHub at runtime.

- [ ] **Step 5: Compose the 55 canonical seeds**

Keep the five existing IDs from `goldenFixture.ts`, upgrade those records with `source: 'seed'`, real `ingredients`, and existing or explicit steps, then export:

```ts
export const CANONICAL_RECIPE_SEEDS: readonly SavedRecipe[] = [
  ...LEGACY_DEMO_RECIPES,
  ...DEMO_RECIPE_SEEDS,
]
```

Make the legacy `RECIPES` export point to this canonical array so existing imports keep working.

- [ ] **Step 6: Run catalog tests and verify GREEN**

Run:

```bash
npm test -- --run src/fixtures/demoRecipeCatalog.test.ts src/app/recipes.test.ts
```

Expected: both files PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/recipes.ts src/fixtures/goldenFixture.ts src/fixtures/demoRecipeCatalog.ts src/fixtures/demoRecipeCatalog.test.ts
git commit -m "feat: add curated demo recipe catalog"
```

### Task 2: Merge canonical seeds into existing Demo storage

**Files:**
- Modify: `src/app/recipes.ts`
- Modify: `src/app/recipes.test.ts`

- [ ] **Step 1: Write failing migration tests**

Cover these observable cases:

```ts
it('adds missing canonical seeds to old local storage')
it('refreshes canonical seed content by stable id')
it('preserves user and assistant recipes')
it('does not mutate parsed storage records')
it('returns all canonical seeds when storage is invalid')
```

Use a fake storage object and assert the result contains all 55 stable seed IDs plus custom records.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- --run src/app/recipes.test.ts
```

Expected: FAIL because the current loader returns any stored array unchanged.

- [ ] **Step 3: Implement stable-ID merge**

Add a pure helper:

```ts
export function mergeRecipeSeeds(
  stored: readonly SavedRecipe[],
  seeds: readonly SavedRecipe[] = CANONICAL_RECIPE_SEEDS,
): SavedRecipe[] {
  const seedIds = new Set(seeds.map((recipe) => recipe.id))
  const custom = stored.filter((recipe) => !seedIds.has(recipe.id))
  return [...seeds.map(cloneRecipe), ...custom.map(cloneRecipe)]
}
```

`cloneRecipe` must clone `tags`, `need`, `steps`, and each structured ingredient. `loadFavoriteRecipes` must parse arrays through `mergeRecipeSeeds`; invalid/missing storage returns cloned canonical seeds.

- [ ] **Step 4: Mark new custom records explicitly**

Set the favorites form blank record to `source: 'user'`. Set assistant-created recipes to `source: 'assistant'` at their existing creation boundary. Do not infer source from UI labels.

- [ ] **Step 5: Run migration and app tests**

Run:

```bash
npm test -- --run src/app/recipes.test.ts src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/recipes.ts src/app/recipes.test.ts src/App.tsx src/scenes/recipe/FavoriteRecipesModal.tsx
git commit -m "feat: merge demo recipe seeds safely"
```

### Task 3: Use real ingredients and steps throughout the Demo

**Files:**
- Modify: `src/scenes/recipe/recipeContent.ts`
- Create: `src/scenes/recipe/recipeContent.test.ts`
- Modify: `src/scenes/recipe/RecipeDetailModal.tsx`
- Modify: `src/App.tsx`
- Modify: relevant missing-ingredient tests in `src/App.test.tsx`

- [ ] **Step 1: Write failing real-content tests**

Add tests proving:

```ts
expect(recipeDisplaySteps(structuredRecipe)).toEqual(structuredRecipe.steps)
expect(recipeIngredients(structuredRecipe)).toEqual([
  { key: 'tomato', name: '番茄', amount: '2个' },
])
expect(toIllustrationRecipe(structuredRecipe).ingredients[0]).toEqual({
  name: '番茄',
  amount: '2个',
})
expect(toIllustrationRecipe(structuredRecipe).steps.map((step) => step.action))
  .toEqual(structuredRecipe.steps)
```

Also prove legacy recipes without `ingredients` or `steps` still receive the current fallback content.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npm test -- --run src/scenes/recipe/recipeContent.test.ts
```

Expected: FAIL because real steps and structured ingredients are ignored.

- [ ] **Step 3: Implement structured-first adapters**

Export:

```ts
export function recipeIngredients(recipe: Recipe): RecipeIngredient[] {
  if (recipe.ingredients?.length) return recipe.ingredients.map((item) => ({ ...item }))
  return recipe.need.map((key) => ({ key: isFoodKey(key) ? key : undefined, name: ingredientName(key) }))
}

export function recipeDisplaySteps(recipe: Recipe): string[] {
  if (recipe.steps?.length) return [...recipe.steps]
  return legacyDisplaySteps(recipe)
}
```

Map each real step into the illustration contract in order, keeping the rewritten sentence as `action`. Preserve the legacy four-step adapter only when `steps` is absent.

- [ ] **Step 4: Render real ingredient amounts in details**

Update `RecipeDetailModal` to display `recipeIngredients(recipe)` and hide `time` when it is `0`. Keep unknown ingredients as text and the generic food-box icon.

- [ ] **Step 5: Unify shopping ingredient resolution**

At the existing missing-ingredients boundary in `App.tsx`, resolve structured ingredient keys first, then match names against catalog Chinese name, English name, and aliases. Keep unmatched Chinese names instead of dropping them.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
npm test -- --run src/scenes/recipe/recipeContent.test.ts src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/recipe/recipeContent.ts src/scenes/recipe/recipeContent.test.ts src/scenes/recipe/RecipeDetailModal.tsx src/App.tsx
git commit -m "feat: use real recipe ingredients and steps"
```

### Task 4: Build the shared searchable recipe picker

**Files:**
- Create: `src/scenes/recipe/RecipeCatalogPicker.tsx`
- Create: `src/scenes/recipe/RecipeCatalogPicker.test.tsx`
- Create: `src/scenes/recipe/RecipeCatalogPicker.css`
- Modify: `src/scenes/recipe/RecipeScene.css`

- [ ] **Step 1: Write failing picker tests**

Cover:

```ts
it('searches title, ingredient, and tag')
it('filters all fifteen categories with a labelled select')
it('shows result count and an empty state')
it('highlights the selected recipe with aria-pressed')
it('shows ingredients, steps, and an optional action button')
it('hides unknown time instead of rendering zero minutes')
```

Use real recipe-shaped fixtures, not component mocks.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npm test -- --run src/scenes/recipe/RecipeCatalogPicker.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the picker interface**

Use this parent-owned selection contract:

```ts
interface RecipeCatalogPickerProps {
  recipes: readonly SavedRecipe[]
  selectedId?: string
  onSelect: (recipe: SavedRecipe) => void
  onOpen?: (recipe: SavedRecipe) => void
  actionLabel?: string
  onAction?: (recipe: SavedRecipe) => void
}
```

Inside the component, keep only `query` and `category`. Use `useMemo` to match normalized title, English title, tags, `need`, and structured ingredient names. Render a labelled category `<select>`, result count, responsive card grid, selected preview, and optional action.

- [ ] **Step 4: Add responsive, accessible styling**

Use existing cream background, dark hard borders, coral/green/yellow accents, and pixel typography. Desktop uses two card columns; narrow screens use one. Provide visible `:focus-visible`, text plus border selected state, wrapping details, and no page-level horizontal overflow.

- [ ] **Step 5: Run picker tests and verify GREEN**

Run:

```bash
npm test -- --run src/scenes/recipe/RecipeCatalogPicker.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/recipe/RecipeCatalogPicker.tsx src/scenes/recipe/RecipeCatalogPicker.test.tsx src/scenes/recipe/RecipeCatalogPicker.css src/scenes/recipe/RecipeScene.css
git commit -m "feat: add shared recipe catalog picker"
```

### Task 5: Integrate the picker into favorites and weekly planning

**Files:**
- Modify: `src/scenes/recipe/FavoriteRecipesModal.tsx`
- Create: `src/scenes/recipe/FavoriteRecipesModal.test.tsx`
- Modify: `src/scenes/recipe/MealPlannerModal.tsx`
- Modify: `src/scenes/recipe/RecipeScene.test.tsx`

- [ ] **Step 1: Write failing favorites behavior tests**

Prove the modal:

- passes all recipes to the shared picker;
- opens selected seed recipes;
- labels seed records as `演示食谱`;
- does not render edit/delete controls for `source: 'seed'`;
- keeps edit/delete for `source: 'user' | 'assistant'`;
- keeps `＋ 新建食谱`.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npm test -- --run src/scenes/recipe/FavoriteRecipesModal.test.tsx
```

Expected: FAIL because all records currently render edit/delete controls and no picker.

- [ ] **Step 3: Integrate favorites**

Replace the unfiltered row map with `RecipeCatalogPicker`. Keep custom-edit state and form behavior. The picker `onOpen` opens details; custom controls belong in the selected preview area or a clearly associated action row.

- [ ] **Step 4: Write failing planner confirmation tests**

Prove:

```ts
fireEvent.click(screen.getByRole('button', { name: /选择番茄肥牛锅/ }))
expect(onAssign).not.toHaveBeenCalled()
fireEvent.click(screen.getByRole('button', { name: '加入这餐' }))
expect(onAssign).toHaveBeenCalledWith('mon', 'dinner', selectedRecipe)
```

Also cover search/category availability and `清空这顿`.

- [ ] **Step 5: Run planner tests and verify RED**

Run:

```bash
npm test -- --run src/scenes/recipe/RecipeScene.test.tsx
```

Expected: FAIL because current selection assigns immediately.

- [ ] **Step 6: Integrate planner with explicit confirmation**

When a day and meal are active, keep a local `candidateId`, render `RecipeCatalogPicker` with `actionLabel="加入这餐"`, and call `onAssign` only from `onAction`. After assignment, return to the three-meal view and play the success cue.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run:

```bash
npm test -- --run src/scenes/recipe/FavoriteRecipesModal.test.tsx src/scenes/recipe/RecipeScene.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/scenes/recipe/FavoriteRecipesModal.tsx src/scenes/recipe/FavoriteRecipesModal.test.tsx src/scenes/recipe/MealPlannerModal.tsx src/scenes/recipe/RecipeScene.test.tsx
git commit -m "feat: browse recipes in favorites and planner"
```

### Task 6: Integrate the picker into AI recipe illustration

**Files:**
- Modify: `src/scenes/recipe/RecipeIllustrationStudioModal.tsx`
- Modify: `src/scenes/recipe/RecipeIllustrationStudioModal.test.tsx`

- [ ] **Step 1: Write failing studio integration tests**

Prove that preset mode:

- exposes search and category filtering from the shared picker;
- shows the selected recipe’s real ingredients and steps;
- converts real content into the request;
- still requests only `pageIndexes: [1]`;
- preserves the paste mode and its validation.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npm test -- --run src/scenes/recipe/RecipeIllustrationStudioModal.test.tsx
```

Expected: FAIL because preset mode still renders the horizontal source list.

- [ ] **Step 3: Replace the source list with the shared picker**

Keep `mode`, `selectedRecipeId`, and paste parsing local. In preset mode render:

```tsx
<RecipeCatalogPicker
  recipes={recipes}
  selectedId={selectedRecipe?.id}
  onSelect={(recipe) => setSelectedRecipeId(recipe.id)}
/>
```

Keep the existing `RecipeIllustrationPanel` below the picker, keyed by source mode and selected recipe ID, with `singleImage`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npm test -- --run src/scenes/recipe/RecipeIllustrationStudioModal.test.tsx src/features/recipeIllustration/RecipeIllustrationPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/recipe/RecipeIllustrationStudioModal.tsx src/scenes/recipe/RecipeIllustrationStudioModal.test.tsx
git commit -m "feat: browse recipe catalog for illustration"
```

### Task 7: Add colorful ingredient SVGs and unified aliases

**Files:**
- Modify: `src/catalog/foodCatalog.ts`
- Modify: `src/catalog/catalog.test.tsx`
- Modify: `src/scenes/fridge/foodPresentation.ts`
- Create: `src/scenes/fridge/foodPresentation.test.ts`

- [ ] **Step 1: Write failing catalog completeness tests**

Add the required keys:

```ts
const colorfulKeys: FoodKey[] = [
  'eggplant', 'avocado', 'pumpkin', 'corn', 'garlic',
  'celery', 'bambooShoot', 'peanut', 'beans', 'tea', 'banana',
]
```

For each key, assert an SVG and catalog entry exist, SVG contains `viewBox="0 0 16 16"`, `shape-rendering="crispEdges"`, and `#2B2117`, and contains neither external URLs nor `<script`/`<foreignObject>`.

Add alias-resolution tests for `茄子`, `牛油果`, `南瓜`, `玉米`, `西芹`, `竹笋`, `花生`, and representative existing pork/tofu aliases.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npm test -- --run src/catalog/catalog.test.tsx
```

Expected: FAIL for the ten missing keys and alias behavior.

- [ ] **Step 3: Add and polish SVGs**

Add ten trusted inline SVGs following the 16×16 pixel rules. Use distinct purple, green, orange, and yellow fills while retaining the dark outline. Refine the existing banana SVG in place without changing its key.

- [ ] **Step 4: Add complete catalog entries**

Add Chinese/English names, aliases, category, kcal, quantity, `addedDaysAgo`, and `expiresInDays` for every key. Keep values as generic catalog defaults, not recipe claims.

- [ ] **Step 5: Use one catalog name resolver**

Export a helper that matches key, Chinese name, English name, and aliases case-insensitively. Replace any browser inventory or shopping mapping that only checks standard names so aliases render the same SVG everywhere.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
npm test -- --run src/catalog/catalog.test.tsx src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/catalog/foodCatalog.ts src/catalog/catalog.test.tsx src/scenes/fridge/foodPresentation.ts src/scenes/fridge/foodPresentation.test.ts
git commit -m "feat: expand colorful food icon catalog"
```

### Task 8: Full regression, visual verification, and scope audit

**Files:**
- Modify only test snapshots or CSS if an observed regression requires it.

- [ ] **Step 1: Run the full unit suite**

Run:

```bash
npm test -- --run
```

Expected: all test files PASS with zero failed tests.

- [ ] **Step 2: Run production and RTH builds**

Run:

```bash
npm run build
npm run test:rth-html
npm run build:rth
```

Expected: all commands exit `0`.

- [ ] **Step 3: Run focused browser verification**

Start the local Vite server and verify `/demo` at desktop and mobile sizes:

- favorites shows 55 unique recipes and all 15 categories;
- searching `茄子` finds `红烧茄子`;
- planner selection does not commit before `加入这餐`;
- illustration preset uses a selected catalog recipe and produces the existing single-image request path;
- seed recipes lack edit/delete while a newly created recipe has them;
- cards and modals have no horizontal page overflow.

- [ ] **Step 4: Audit the diff boundary**

Run:

```bash
git diff main...HEAD --name-only
git diff main...HEAD -- api vercel.json '.env*'
git diff --check
```

Expected: no backend, environment, or Vercel configuration diff; no whitespace errors.

- [ ] **Step 5: Run shipped-content safety scan**

Scan built frontend assets and source fixture data for prohibited source branding, `http://`/`https://`, `<script`, `<iframe`, supplier fields, and source image paths. Expected: no match in shipped recipe data or generated assets.

- [ ] **Step 6: Commit any verification-only corrections**

If verification required corrections, inspect `git status --short`, add each corrected file by its exact path, rerun the command that exposed the regression, then commit with `git commit -m "test: verify demo recipe library"`. Skip this step when the worktree is already clean.
