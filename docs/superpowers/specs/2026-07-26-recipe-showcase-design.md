# 冰箱精灵 Landing 食谱作品展示设计规格

日期：2026-07-26

状态：已完成视觉选择，待书面确认

范围：`/` Landing Page 的食谱作品展示区

不涉及：食谱生成 API、Android、Skill 配置、图片内容修改、风格选择 UI

## 1. 目标与边界

在现有冰箱精灵长页中加入四张真实食谱插画，让作品直接说明“食谱可以被转换成清晰的视觉步骤”。

本区遵守以下边界：

- 页面只展示图片，不显示或配置任何风格名称、描述、标签、内部 Skill 名称、艺术家姓名、模型名、角色名或“小黑”等词。
- 四张图表达同一份番茄炒蛋食谱，页面不解释它们之间的差异。
- 页面配置只保留一个 `images` 数组。
- 图片完整呈现，使用 `object-fit: contain`，不得裁掉菜名、步骤、成品或页码。
- 来源和授权信息进入仓库 Legal/Attribution 文档，不进入 Landing UI 或展示配置。

## 2. 页面位置与信息层级

展示区放在“三项核心能力”之后、“家庭实体数据”之前。

这个位置让页面先解释完整生命周期、家庭 IoT、多模态入口和产品能力，再用真实作品给出视觉证明，随后进入更抽象的家庭实体数据与 Ubiquitous AI 判断。

区内只使用以下文案：

- 标题：`把做饭这件事，画得更简单。`
- 说明：`从食材到上桌，一眼看懂。`
- 按钮：`开始制作`

按钮进入现有 `/demo`，并沿用 Landing 已有的同域路由行为。

不新增 Header 锚点、图片标题、图片说明、图片序号文字或风格筛选入口。

## 3. 视觉构图

采用已确认的“一个主画面，三个回声”构图。

桌面端：

- 第 2 张图片默认处于主位，宽度约为展示舞台的 31%，完整可读。
- 其余三张以较小尺寸从舞台底部错落探出，彼此不完全遮挡。
- 文案位于左侧，主图位于右侧，副图沿底部形成视觉延伸。
- 图片使用硬边框和克制的实体投影，继承现有 Landing 的奶油底色、珊瑚按钮、硬边框和像素品牌语言。
- 图片圆角不超过 `16px`，不添加渐变遮罩、玻璃效果或覆盖在图片上的按钮。

四张图片的源码顺序保持 `01 → 02 → 03 → 04`。默认主图为索引 `1`，后续滚动换位顺序为 `02 → 01 → 03 → 04`。这个展示顺序由组件内部常量决定，配置中不保存 `featured`、`name`、`style`、`description` 或 `tag`。

## 4. 滚动与交互

桌面端使用一段自然纵向滚动驱动的主位轮换：

- 展示区总高度约 `240svh`。
- 舞台在视口内使用 `position: sticky`，不劫持滚轮。
- 根据展示区滚动进度按 `02 → 01 → 03 → 04` 换到主位。
- 每次换位只动画 `transform`、`opacity` 和必要的 `filter`，不动画布局属性。
- 缓动使用无弹性的 ease-out 曲线。
- 鼠标悬停在主图时只做轻微上移，不放大文字或显示额外信息。
- 不使用自动轮播、计时器或无限循环。

桌面端提供四个无文字进度点，点击可将对应图片切到主位。按钮的可访问名称为 `查看番茄炒蛋食谱插画示例 1` 至 `4`。

`prefers-reduced-motion: reduce` 下：

- 关闭滚动驱动换位和持续动效。
- 保留默认主图及可点击进度点。
- 状态切换立即完成。

## 5. 移动端

在小于 `768px` 的视口中取消 sticky 舞台和叠放构图：

- 文案位于图片列表上方。
- 四张图片放入原生横向滚动容器。
- 每张宽度约 `78vw`，下一张露出约 12%。
- 使用 `scroll-snap-type: x mandatory` 和 `scroll-snap-align: start`。
- 保留触摸原生惯性，不实现拖拽库或自定义手势。
- 页面不得产生整体横向溢出。

## 6. 素材与配置

正式素材复制到：

```text
public/assets/recipe/recipe-sample-01.webp
public/assets/recipe/recipe-sample-01@2x.webp
public/assets/recipe/recipe-sample-02.webp
public/assets/recipe/recipe-sample-02@2x.webp
public/assets/recipe/recipe-sample-03.webp
public/assets/recipe/recipe-sample-03@2x.webp
public/assets/recipe/recipe-sample-04.webp
public/assets/recipe/recipe-sample-04@2x.webp
```

展示配置固定为：

```ts
export const recipeShowcase = {
  images: [
    '/assets/recipe/recipe-sample-01.webp',
    '/assets/recipe/recipe-sample-02.webp',
    '/assets/recipe/recipe-sample-03.webp',
    '/assets/recipe/recipe-sample-04.webp',
  ],
}
```

组件根据文件名生成 `@2x` 的 `srcSet`，配置对象不得增加其他字段。

每张图片显式声明 `width="1200"`、`height="1440"`、`loading="lazy"` 和 `decoding="async"`。四张图的替代文本分别为 `番茄炒蛋食谱插画示例 1` 至 `4`。

## 7. 组件边界

新增独立组件 `src/landing/RecipeShowcase.tsx`：

- 读取中性图片数组。
- 维护当前主图索引。
- 计算桌面端滚动进度。
- 输出桌面舞台、移动横滑列表和可访问进度点。
- 接收现有 Demo 打开回调，不负责路由或 API。

新增 `src/landing/recipeShowcase.ts`，只导出 `images` 配置。

Landing Page 只负责把展示组件插入批准位置，并把现有 `openDemo` 回调传入。

滚动计算使用 `requestAnimationFrame` 合并更新；组件卸载时移除事件监听并取消未完成帧。`window`、`matchMedia` 或动画 API 不可用时，组件回退到默认主图。

## 8. Legal 与仓库交付

将素材包中的来源和授权文件复制到：

```text
docs/legal/recipe-illustrations/ATTRIBUTION.md
docs/legal/recipe-illustrations/LICENSE-IAN-MIT.txt
```

Legal 文件不被组件导入，也不产生 Landing UI。

不复制素材包中的内部测试目录、失败样本、旧命名卡片、原始 PNG 或 Contact Sheet。

## 9. 验收与测试

单元测试：

- 配置对象只有 `images` 一个字段，包含四个中性路径。
- 页面出现标题、短说明和“开始制作”。
- 页面与配置不出现受限词及任何风格描述。
- 默认主图为第 2 张。
- 点击进度点可切换主图。
- 四张图片都有正确的 `src`、`srcSet`、尺寸和替代文本。
- Demo 按钮保持同域 `/demo` 行为。
- 无浏览器动画能力时仍能渲染。

端到端测试：

- 桌面端滚动展示区时，四张图可按批准顺序成为主图。
- `prefers-reduced-motion` 下不启用滚动换位。
- `360 / 412 / 480` 宽度下横向滑动区可用，页面本身无横向溢出。
- 四张图片完整显示，`object-fit` 为 `contain`。

生产验证：

- `npm test`
- `npm run build`
- `npm run e2e`
- `npm run test:rth-html`
- `npm run build:rth`
- Vercel 和 Retinbox 两条发布通道均成功。
