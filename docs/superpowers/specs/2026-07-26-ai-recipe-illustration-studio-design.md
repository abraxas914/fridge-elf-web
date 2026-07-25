# AI 食谱插画工作台设计

## 目标

在食谱页“食谱工坊”补齐第四个功能格“AI 食谱插画”。用户可从已有 Mock/收藏食谱中选择，也可粘贴自己的食谱文字；两种输入最终都通过现有前端 `RecipeIllustrationPort` 消费既有 `/api/illustrate` 能力，并且只展示一张生成图片。

## 明确边界

- 保留食谱详情页现有“生成食谱插画”入口和分页行为。
- 不修改 `api/**`、`vercel.json`、环境变量、网关、Firewall 或生产密钥。
- 不增加新的后端接口，也不让浏览器直接接触上游密钥。
- Demo 内不持久化粘贴内容、选择状态或生成图片；关闭弹窗即清空。
- 新入口的输出固定为一张图片，不展示解析结果、JSON 或 Agent 文本回复。

## 用户体验

### 第四格

- 位置：当前 2 列网格的右下角。
- 标题：`AI 食谱插画`
- 英文副标题：`IMAGE2`
- 视觉：复用现有蓝色 `action-btn.d` 与 `camera` 像素图标。

### 工作台弹窗

弹窗提供两个互斥的输入模式：

1. `选择食谱`
   - 默认选中第一道可用食谱。
   - 展示当前 Mock/收藏食谱列表。
   - 选择后将现有 `SavedRecipe` 转成 `RecipeIllustrationRecipe`。

2. `粘贴食谱`
   - 提供一个带格式示例的多行文本框。
   - 前端解析菜名、食材和步骤。
   - 输入为空、缺少食材或缺少步骤时在表单内显示错误，不发起图片请求。

两个模式共享现有四种插画风格。点击“生成食谱插画”后只请求第 1 页，界面显示一张纵向图片，以及“保存图片”和“重新生成”操作。

## 前端数据流

```text
SavedRecipe ── toIllustrationRecipe ──┐
                                     ├─ RecipeIllustrationRecipe
粘贴文本 ── parsePastedRecipe ────────┘
                                     │
                                     └─ RecipeIllustrationPanel(single)
                                        └─ existing RecipeIllustrationPort
                                           └─ existing /api/illustrate
```

### 粘贴文本解析

解析器仅存在于前端食谱场景目录，不修改后端共享解析器。它支持：

- 第一行作为菜名；
- `食材`、`材料`、`用料`等分段标题；
- `步骤`、`做法`等分段标题；
- `1.`、`1、`、`步骤 1`以及步骤段内的项目符号；
- 常见数量单位从食材名称中分离。

为适配现有单页后端能力，超过 6 步的食谱在前端按顺序合并为最多 6 个步骤，确保所有原步骤仍被包含在唯一图片的提示词中。

## 组件设计

### `RecipeIllustrationStudioModal`

负责输入模式、食谱选择、粘贴文本、校验错误以及把规范化食谱交给生成面板。组件只持有弹窗生命周期内的 React state。

### `RecipeIllustrationPanel`

新增可选的 `singleImage` 属性，默认 `false`：

- 详情页不传该属性，行为不变；
- 工作台传入 `singleImage`，所有首次生成和重试都只传 `pageIndexes: [1]`；
- 单图模式隐藏“第 1 页”等分页文案，保留保存与重新生成。

### `RecipeScene` 与 `App`

`RecipeScene` 新增 `onOpenIllustration` 回调并渲染第四格。`App` 增加 `recipe-illustration` 弹窗分支，传入当前 `favoriteRecipes`、既有 `runtime.recipeIllustration` 和当前 managed 状态。

## 错误与状态

- 不可解析：显示“请粘贴包含菜名、食材和步骤的食谱”。
- 生成中：禁用输入模式、食谱选择和风格选择，避免结果与输入错配。
- 图片请求失败：复用现有通用错误提示和重新生成能力。
- 切换输入模式或修改源食谱：重建生成面板，清除旧图片结果。

## 测试与验收

- 食谱页正好显示四个功能格，第四格调用独立回调。
- 粘贴解析器覆盖标准文本、项目符号步骤、缺失字段和超过 6 步压缩。
- 工作台可在预设食谱与粘贴食谱间切换。
- 无效粘贴内容不会调用图片端口。
- 单图生成请求包含 `pageIndexes: [1]`，且结果只展示一张图片。
- 食谱详情页旧入口仍不携带 `pageIndexes`，原多页契约不变。
- Git diff 中 `api/**`、`vercel.json` 和环境配置无变更。

