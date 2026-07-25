# Fridge Elf Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan.

**Goal:** 将 `/` 改造成一张围绕食材全生命周期、家庭 IoT 和 Ubiquitous AI 展开的长页，同时保留 APK Release 与 `/demo` 单域入口。

**Architecture:** 保持现有 React SPA 和发布接口不变。`LandingPage` 负责数据读取和叙事编排；独立 SVG 组件负责产品场景；一个共享的 `IntersectionObserver` Hook 负责章节进入状态；CSS 使用现有 Design Token，并只在 Landing 作用域新增动效参数。公开文案只表达产品关系，不展示开发板、操作系统、网络协议、供应商或模型名。

**Tech Stack:** React 19、TypeScript、Vite、CSS、inline SVG、Vitest、Testing Library、Playwright

---

## 实施边界

- 仅改造 `/`，不重构 `/demo`、Release API、Android 或固件。
- 保留 `/api/releases/latest`、`/api/download/android` 和 `onOpenDemo` 的现有行为。
- 不引入外部图片、字体、动画库或新的运行时依赖。
- 不使用强制滚动、WebGL、渐变、玻璃拟态或写实 3D。
- `IoT`、`AIoT`、`Ubiquitous AI` 可以出现，但不得公开罗列 T5AI、Android、Wi-Fi、MQTT、DashScope 等底层实现。
- 保留工作区中与本任务无关的未跟踪文件。

## Task 1：锁定长页语义与 CTA 行为

**Files:**

- Modify: `src/LandingPage.test.tsx`
- Modify: `src/LandingPage.tsx`

### Step 1：先写失败测试

在 `src/LandingPage.test.tsx` 增加以下断言：

```tsx
it('tells the full food lifecycle story without exposing implementation details', async () => {
  render(<LandingPage fetcher={releaseFetcher} />)

  expect(
    screen.getByRole('heading', {
      name: '让冰箱里的每一份食材，都有始有终。',
    }),
  ).toBeVisible()
  expect(screen.getByRole('heading', {
    name: '从买回来，到用掉，再回到下一次采购。',
  })).toBeVisible()
  expect(screen.getByRole('heading', {
    name: '冰箱旁和手机上，始终是同一份库存。',
  })).toBeVisible()
  expect(screen.getByText('家庭共享库存')).toBeVisible()
  expect(screen.getByRole('heading', {
    name: '今天先从冰箱开始。',
  })).toBeVisible()

  expect(screen.queryByText(/T5AI|Android、Wi-Fi|MQTT|DashScope/)).not.toBeInTheDocument()
})
```

将现有 Hero 断言更新为批准后的标题，并继续断言：

```tsx
expect(screen.getByRole('link', { name: '打开在线 Demo' }))
  .toHaveAttribute('href', '/demo')
expect(screen.getByRole('link', { name: '下载 Android APK' }))
  .toHaveAttribute('href', '/api/download/android')
```

### Step 2：确认测试先失败

Run:

```bash
npm test -- src/LandingPage.test.tsx
```

Expected: FAIL，找不到新的 Hero、生命周期、家庭 IoT 与 Ubiquitous AI 标题。

### Step 3：实现完整语义结构

重写 `src/LandingPage.tsx`，保留 Release 请求和 `openDemo` 逻辑，新增：

```tsx
const navigation = [
  ['lifecycle', '食材的一生'],
  ['iot', '家庭 IoT'],
  ['multimodal', '多模态'],
  ['why', '为什么'],
  ['experience', '体验'],
] as const
```

页面按以下顺序输出：

```text
Header
Hero
日常问题
食材全生命周期
家庭 IoT
多模态入口
三项核心能力
家庭实体数据
Ubiquitous AI
Release + 最终 CTA
Footer
```

每个章节使用语义化 `<section>`、唯一标题和规格中已经批准的完整文案。Hero CTA 顺序固定为 Demo 在前、APK 在后。Release 加载失败时 Demo 始终可用。

### Step 4：运行测试

Run:

```bash
npm test -- src/LandingPage.test.tsx
```

Expected: PASS。

### Step 5：提交

```bash
git add src/LandingPage.tsx src/LandingPage.test.tsx
git commit -m "feat: structure fridge elf landing story"
```

## Task 2：建立可访问的章节进入状态与滚动进度

**Files:**

- Create: `src/landing/useLandingReveal.ts`
- Create: `src/landing/useLandingReveal.test.tsx`
- Create: `src/landing/LandingSection.tsx`
- Modify: `src/LandingPage.tsx`

### Step 1：先写 Hook 失败测试

测试需要覆盖：

```tsx
it('reveals content immediately when IntersectionObserver is unavailable', () => {
  vi.stubGlobal('IntersectionObserver', undefined)
  const { result } = renderHook(() => useLandingReveal())
  expect(result.current.revealRef.current).toBeNull()
})

it('marks an observed element visible after it intersects', () => {
  const observer = installIntersectionObserverMock()
  render(<RevealProbe />)
  act(() => observer.trigger({ isIntersecting: true }))
  expect(screen.getByTestId('probe')).toHaveAttribute('data-visible', 'true')
})
```

### Step 2：确认测试失败

Run:

```bash
npm test -- src/landing/useLandingReveal.test.tsx
```

Expected: FAIL，模块尚不存在。

### Step 3：实现共享 Hook 和章节壳

`useLandingReveal` 返回 `revealRef` 和 `isVisible`。规则：

- 浏览器支持 `IntersectionObserver` 时，阈值使用 `0.18`。
- 首次进入后保持可见，不在上下滚动时重复闪烁。
- 不支持 Observer 时直接显示。
- 组件卸载时断开 Observer。

`LandingSection` API：

```tsx
type LandingSectionProps = {
  id?: string
  className?: string
  labelledBy: string
  children: ReactNode
  snap?: boolean
}
```

输出 `data-visible`，供 CSS 控制渐入；内容在 JavaScript 失败时也保持可读。

### Step 4：接入章节与进度轨

在 `LandingPage`：

- 需要动效的主要章节使用 `LandingSection`。
- 桌面右侧增加可访问的章节进度导航，链接到五个锚点。
- Header 桌面导航复用同一组锚点。
- 所有锚点链接保留正常浏览器行为，不拦截滚动。

### Step 5：运行测试

Run:

```bash
npm test -- src/landing/useLandingReveal.test.tsx src/LandingPage.test.tsx
```

Expected: PASS。

### Step 6：提交

```bash
git add src/landing/useLandingReveal.ts src/landing/useLandingReveal.test.tsx src/landing/LandingSection.tsx src/LandingPage.tsx
git commit -m "feat: add landing reveal and section navigation"
```

## Task 3：用原创 SVG 建立生活问题与 Hero 视觉

**Files:**

- Create: `src/landing/illustrations/FridgeHeroSvg.tsx`
- Create: `src/landing/illustrations/FridgeShelfSvg.tsx`
- Create: `src/landing/illustrations/illustrations.test.tsx`
- Modify: `src/LandingPage.tsx`

### Step 1：先写 SVG 失败测试

```tsx
it('gives every decorative product scene an accessible description', () => {
  render(
    <>
      <FridgeHeroSvg />
      <FridgeShelfSvg />
    </>,
  )

  expect(screen.getByRole('img', { name: '冰箱精灵在冰箱旁记录食材' }))
    .toBeVisible()
  expect(screen.getByRole('img', { name: '食材在冰箱层架中逐渐被遮挡' }))
    .toBeVisible()
})
```

### Step 2：确认测试失败

Run:

```bash
npm test -- src/landing/illustrations/illustrations.test.tsx
```

Expected: FAIL，组件尚不存在。

### Step 3：实现 Hero SVG

`FridgeHeroSvg` 使用：

- `<title>` 与 `<desc>`。
- `viewBox="0 0 560 620"`。
- `shapeRendering="crispEdges"`。
- 现有 CSS Token 作为填色和描边。
- 冰箱、小屏、鸡蛋、牛奶、便签、同步提示等对象。
- 3–5px 硬描边，不使用渐变或位图。
- 将可动对象分组为 `.hero-fridge-float`、`.hero-screen-pulse`、`.hero-food-bob`。

### Step 4：实现层架 SVG

`FridgeShelfSvg` 通过一个连续的冰箱内部视图呈现四个问题，不制作四张卡片。问题标签与层架上的牛奶、鸡蛋、牛肉和遮挡关系对应。

### Step 5：替换旧视觉

删除 `LandingPage` 中旧的纯 CSS 冰箱 DOM，将两张 SVG 接入 Hero 与问题章节。

### Step 6：运行测试

Run:

```bash
npm test -- src/landing/illustrations/illustrations.test.tsx src/LandingPage.test.tsx
```

Expected: PASS。

### Step 7：提交

```bash
git add src/landing/illustrations/FridgeHeroSvg.tsx src/landing/illustrations/FridgeShelfSvg.tsx src/landing/illustrations/illustrations.test.tsx src/LandingPage.tsx
git commit -m "feat: illustrate fridge elf hero and daily problems"
```

## Task 4：实现生命周期、IoT 与多模态 SVG

**Files:**

- Create: `src/landing/illustrations/LifecycleSvg.tsx`
- Create: `src/landing/illustrations/DeviceSyncSvg.tsx`
- Create: `src/landing/illustrations/MultimodalSvg.tsx`
- Modify: `src/landing/illustrations/illustrations.test.tsx`
- Modify: `src/LandingPage.tsx`

### Step 1：扩展失败测试

```tsx
expect(screen.getByRole('img', { name: '食材从购买到再次入库的六步循环' }))
  .toBeVisible()
expect(screen.getByRole('img', { name: '冰箱旁的小屏与手机共享同一份库存' }))
  .toBeVisible()
expect(screen.getByRole('img', { name: '语音视觉触摸和文字共同完成食材录入' }))
  .toBeVisible()
```

并断言生命周期六个阶段都在 DOM 中：

```tsx
for (const label of ['买回家', '被记录', '被照看', '变成一餐', '缺货采购', '再次入库']) {
  expect(screen.getByText(label)).toBeVisible()
}
```

### Step 2：确认测试失败

Run:

```bash
npm test -- src/landing/illustrations/illustrations.test.tsx
```

Expected: FAIL，新 SVG 组件尚不存在。

### Step 3：实现生命周期 SVG

- 使用一条闭合路径与六个节点。
- 路径添加 `.lifecycle-path`，节点添加 `.lifecycle-node`。
- 六个文本标签保持为 HTML 内容，避免 SVG 小字可读性问题。
- 进入视口时依次绘制路径和节点；Reduced Motion 下直接显示完成态。

### Step 4：实现设备同步 SVG

- 只画“冰箱旁的小屏”“家人手中的应用”“共享库存”。
- 使用流动的数据块表达双向更新。
- 不显示任何底层技术或厂商名。
- 动效类名为 `.sync-packet`，仅在章节可见且允许动效时运行。

### Step 5：实现多模态 SVG

- 中央为一件刚放入冰箱的食材。
- 四周为语音、视觉、触摸、文字入口。
- 视觉节点明确显示 `STILL IMPROVING`，不可暗示已经稳定完成。

### Step 6：接入页面并测试

Run:

```bash
npm test -- src/landing/illustrations/illustrations.test.tsx src/LandingPage.test.tsx
```

Expected: PASS。

### Step 7：提交

```bash
git add src/landing/illustrations/LifecycleSvg.tsx src/landing/illustrations/DeviceSyncSvg.tsx src/landing/illustrations/MultimodalSvg.tsx src/landing/illustrations/illustrations.test.tsx src/LandingPage.tsx
git commit -m "feat: visualize lifecycle iot and multimodal flow"
```

## Task 5：完成 Ubiquitous AI 场景与长页视觉系统

**Files:**

- Create: `src/landing/illustrations/HomeScenesSvg.tsx`
- Modify: `src/landing/illustrations/illustrations.test.tsx`
- Modify: `src/LandingPage.css`
- Modify: `src/LandingPage.tsx`

### Step 1：补充场景测试

```tsx
expect(screen.getByRole('img', {
  name: '同一个安静的家庭入口可以来到冰箱衣柜和药柜旁',
})).toBeVisible()
```

### Step 2：确认测试失败

Run:

```bash
npm test -- src/landing/illustrations/illustrations.test.tsx
```

Expected: FAIL，场景组件尚不存在。

### Step 3：实现 HomeScenes SVG

- 画面包含冰箱、衣柜、药柜三个独立但相连的家庭场景。
- 中央的小终端保持同一形态，说明“入口泛化”，而不是增加更多终端。
- 标签仅为 `冰箱 · 食材`、`衣柜 · 衣物`、`药柜 · 药品`。
- 使用低频 `.scene-beacon` 动效，不营造强烈科技感。

### Step 4：重写 Landing CSS

在 `.landing-page` 作用域定义：

```css
--motion-fast: 180ms;
--motion-base: 360ms;
--motion-slow: 720ms;
--motion-float: 5800ms;
--ease-out: cubic-bezier(.22, 1, .36, 1);
--ease-gentle: cubic-bezier(.4, 0, .2, 1);
```

布局要求：

- 最大内容宽度约 `1160px`。
- Hero、生命周期、家庭实体数据、最终 CTA 接近一屏。
- 其他章节保持 `70vh`–`90vh` 的阅读节奏。
- 桌面端 `scroll-snap-type: y proximity`。
- 移动端完全关闭 Scroll Snap，所有双列改为单列。
- 标题不使用极端字号或强对比排版，正文宽度控制在舒适阅读范围。
- SVG 和文本之间保留明显留白。

动效要求：

- Hero 冰箱 `5.8s` 漂浮，位移不超过 `6px`、旋转不超过 `1deg`。
- 卡片悬浮只移动 `2px`–`4px`，不做大幅弹跳。
- Reveal 只使用轻微 `translateY` 与 opacity。
- 生命周期路径、同步数据块和场景信号只在相应章节可见时运行。
- 不使用无限高速闪烁。

Reduced Motion：

```css
@media (prefers-reduced-motion: reduce) {
  .landing-page {
    scroll-snap-type: none;
  }

  .landing-page *,
  .landing-page *::before,
  .landing-page *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }

  .landing-reveal {
    opacity: 1;
    transform: none;
  }
}
```

### Step 5：运行单元测试和类型检查

Run:

```bash
npm test -- src/LandingPage.test.tsx src/landing/illustrations/illustrations.test.tsx src/landing/useLandingReveal.test.tsx
npm run build
```

Expected: PASS。

### Step 6：提交

```bash
git add src/landing/illustrations/HomeScenesSvg.tsx src/landing/illustrations/illustrations.test.tsx src/LandingPage.tsx src/LandingPage.css
git commit -m "feat: finish animated fridge elf landing system"
```

## Task 6：端到端验证、响应式检查与最后润色

**Files:**

- Modify: `tests/e2e/landing.spec.ts`
- Create: `tests/e2e/landing-motion.spec.ts`
- Modify: `src/LandingPage.css` only if verification finds a concrete issue

### Step 1：先更新 E2E 断言

更新旧 Hero 标题，并增加：

```ts
await expect(page.getByRole('heading', {
  name: '让冰箱里的每一份食材，都有始有终。',
})).toBeVisible()

await page.getByRole('link', { name: '家庭 IoT' }).click()
await expect(page.locator('#iot')).toBeInViewport()
await expect(page.getByText('家庭共享库存')).toBeVisible()

await expect(page.getByText(/T5AI|MQTT|DashScope/)).toHaveCount(0)
```

### Step 2：增加动效与无障碍 E2E

`tests/e2e/landing-motion.spec.ts` 覆盖：

- 1440×900 桌面：页面可自然长滚动，锚点可达。
- 390×844 移动端：无横向溢出，导航进度轨隐藏，章节按单列排列。
- Reduced Motion：根容器 `scroll-snap-type` 为 `none`，Hero 冰箱无动画。
- 页面中每个 SVG `role="img"` 都有可访问名称。

### Step 3：运行 E2E，确认旧实现无法满足新增测试

Run:

```bash
npm run e2e -- tests/e2e/landing.spec.ts tests/e2e/landing-motion.spec.ts
```

Expected: 新测试在最终 CSS 调整前至少有一个失败；失败必须对应具体布局或动效问题。

### Step 4：只修复验证发现的问题

允许的最后调整：

- 中文断行。
- 移动端 SVG 尺寸和间距。
- 固定 Header 与锚点落点。
- `100dvh` 和 Safari 安全区。
- Focus 样式、对比度和按钮触达尺寸。

不得在此阶段新增未经规格批准的章节、口号或技术列表。

### Step 5：完整验证

Run:

```bash
npm test
npm run build
npm run e2e
```

Expected:

- Vitest 全部通过。
- TypeScript 与 Vite Build 通过。
- Playwright 全部通过。
- `/demo` 原有桌面居中测试不回归。

### Step 6：人工视觉验证

在浏览器检查：

- Desktop 1440×900。
- Tablet 820×1180。
- Mobile 390×844。
- Hero、生命周期、IoT、多模态、实体数据、Ubiquitous AI、Release 和最终 CTA。
- 浏览器控制台无错误。
- 页面公开文字不出现开发板、操作系统、通信协议、供应商或模型名。

如需要生成截图，只保存到现有 Playwright 测试目录或临时目录，不改动用户现有二维码文件。

### Step 7：提交

```bash
git add tests/e2e/landing.spec.ts tests/e2e/landing-motion.spec.ts src/LandingPage.css
git commit -m "test: verify fridge elf landing experience"
```

## 完成标准

- Hero 精确使用：`让冰箱里的每一份食材，都有始有终。`
- 页面足够长，十个区域顺序完整，桌面有柔和翻页感，移动端自然滚动。
- 原创 SVG 至少覆盖 Hero、问题、生命周期、IoT、多模态和家庭场景。
- 冰箱有低频漂浮，流程和同步有与内容相关的动效。
- `prefers-reduced-motion` 下内容完整且没有循环动画。
- Demo 与 APK Release 行为不回归。
- 页面讲清食材全生命周期、家庭 IoT 与 Ubiquitous AI，但不以基础技术栈充当卖点。
