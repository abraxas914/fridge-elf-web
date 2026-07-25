# 冰箱精灵 Landing Page 轻量优化设计规格

日期：2026-07-25

状态：待用户最终审阅

范围：`/` Landing Page

不涉及：`/demo` 产品界面、API、部署架构、全页面视觉重做

## 1. 目标

在保留现有像素品牌、页面结构和交互方式的前提下，重新定义 Landing Page 的首屏叙事与 microcopy。

页面需要让黑客松评委和潜在合作方在首屏理解三个事实：

1. 冰箱精灵管理的是食材从进入冰箱到被使用、再到重新采购的完整过程。
2. 产品由冰箱旁的 T5AI 触屏终端和 Android 手机应用共同组成。
3. 语音、视觉、触摸和文字是自然入口，技术服务于家庭日常，不作为页面主角。

普通家庭用户也应当能从牛奶、鸡蛋、临期食材和买菜等具体经验理解产品，不需要先理解 AIoT、MQTT 或 Ubiquitous AI。

## 2. 文案原则

- 平实、细腻、具体、诚恳。
- 先讲家庭经验，再解释产品判断。
- 不使用融资路演语气、宏大宣言、行业黑话或连续短口号。
- 不使用未经验证的数据和百分比。
- 不把实验能力写成稳定能力。视觉识别可以演示，但必须标注仍在持续完善。
- 不在首屏展示供应商名称、模型名称或技术栈清单。
- “家庭实体数据”和 Ubiquitous AI 只在解释产品缘起时出现，不作为 Hero 标题。

## 3. 信息结构

保持当前页面的自然纵向滚动，不增加 Scroll Snap、章节翻页、演示文稿导航或 WebGL 背景。

页面顺序固定为：

1. Header
2. Hero
3. Release
4. 三项核心能力
5. 产品判断：“为什么是这个小东西”
6. Footer

现有冰箱像素插图继续作为 Hero 主视觉。新增内容只包含一段全宽的产品判断，不扩展为长篇宣言。

## 4. 最终文案

### 4.1 Header

品牌：

```text
FRIDGE ELF
```

品牌副标：

```text
EVERYDAY THINGS · QUIETLY REMEMBERED
```

右侧状态：

```text
DEMO ONLINE
```

### 4.2 Hero

Kicker：

```text
FROM FRIDGE TO TABLE, AND BACK AGAIN
```

H1：

```text
让冰箱里的每一份食材，都有始有终。
```

Lead：

```text
一盒牛奶什么时候买的，鸡蛋还剩几个，哪些菜应该先吃，不必再靠谁一直记着。冰箱精灵留在冰箱旁，也跟着家人到了手机上，陪食材从录入、提醒、做饭走到下一次采购。
```

CTA：

1. 主按钮：`打开在线 Demo`
2. 次按钮：有正式版本时显示 `下载 Android APK`；没有正式版本时显示不可点击的 `APK 正在准备中`

Hero 辅助说明：

```text
语音、视觉、触摸与手机同步。视觉识别仍在持续完善。
```

Hero 冰箱插图继续保留当前 `GOOD DAY!`、时间与 `MILK · 2D`，不在本轮重画插图或增加复杂技术标签。

### 4.3 Release

有正式 Release 时继续显示：

- Release Tag
- APK 文件名
- 文件大小
- Android 系统要求

没有正式 Release 时：

标题：

```text
等待首个正式版本
```

正文：

```text
正式版本发布后，最新安装包会自动出现在这里。现在可以先打开在线 Demo，完整体验冰箱精灵。
```

### 4.4 三项核心能力

#### 01 · 食材进出

标题：

```text
知道冰箱里有什么
```

正文：

```text
说一句、点一下，或者让摄像头看一眼，食材就被记住了。不同批次分别保存，取出两个鸡蛋也能准确更新余量。
```

#### 02 · 提醒与做饭

标题：

```text
该先吃的，及时出现
```

正文：

```text
临期食材会被优先提醒。想不到今天吃什么时，AI 会从现有库存出发给出菜谱，并把缺少的材料放进采购清单。
```

#### 03 · 双端同步

标题：

```text
冰箱旁和手机上，是同一份库存
```

正文：

```text
在家可以直接使用冰箱屏幕，出门买菜时也能从手机确认库存。家庭成员看到的始终是同一份信息。
```

### 4.5 产品判断

标题：

```text
为什么是这个小东西
```

正文：

```text
聊天记录很容易搜索，菜市场买回来的菜却很少留下可以继续使用的信息。于是，家里总要有人记得牛奶什么时候买、鸡蛋还剩多少、那袋牛肉是不是该先吃。

冰箱精灵把一块小硬件放在食材进出的地方，让语音、视觉与触摸顺手留下这些日常变化。今天先从冰箱开始，今后也可以走到衣柜或药柜旁边。
```

该模块以两列信息带呈现：左侧标题，右侧正文。它不是第四张功能卡，也不使用大引用或宣言式排版。

### 4.6 Footer

左侧：

```text
FRIDGE ELF · ADVX 2026
```

右侧：

```text
HACKATHON DEMO · WORK IN PROGRESS
```

## 5. 视觉与组件约束

### 5.1 设计 Token 来源

本轮不创建第二套 Landing Token。下列文件是唯一来源：

- `src/styles/tokens.css`
- `src/styles/pixel.css`
- `src/styles/fonts.css`
- `src/styles/global.css`
- `src/LandingPage.css`

### 5.2 颜色 Token

背景与面板：

| Token | 值 | Landing 用途 |
|---|---:|---|
| `--bg-page` | `#c8c0a8` | 产品舞台背景 |
| `--bg-cream` | `#ebdcb4` | Landing 页面主背景 |
| `--bg-warm` | `#dcc89e` | 暖色辅助背景 |
| `--panel` | `#f5eac8` | Release 与新增判断模块 |
| `--panel-2` | `#e8d5a8` | 禁用按钮 |
| `--panel-3` | `#fbf3db` | 卡片、按钮与冰箱主体 |

品牌色：

| Token | 值 | Landing 用途 |
|---|---:|---|
| `--coral` | `#d96b4f` | 品牌标记、主按钮 |
| `--coral-dk` | `#b04a32` | Kicker |
| `--butter` | `#e8b84a` | 焦点与舞台描边 |
| `--butter-lt` | `#f5d078` | 次按钮、第二功能模块 |
| `--mustard` | `#d9a868` | 冰箱插图阴影与把手 |
| `--mustard-dk` | `#b88848` | 深色芥末辅助色 |
| `--navy` | `#4a6b8f` | 辅助装饰 |
| `--navy-dk` | `#2e4b6b` | 冰箱显示屏 |
| `--navy-lt` | `#6b8fb0` | 浅海军蓝辅助色 |
| `--sage` | `#7a9968` | 在线状态 |
| `--sage-dk` | `#5a7a4b` | 深鼠尾草辅助色 |
| `--sage-lt` | `#a8c08a` | 第三功能模块与冰箱便签 |
| `--peach` | `#e89870` | 桃色辅助色 |
| `--rose` | `#c86b7a` | 玫瑰辅助色 |
| `--wall` | `#c8bfa5` | 产品场景墙面 |
| `--floor` | `#e8dbc4` | 产品场景地面 |
| `--floor-dk` | `#b89877` | 产品场景地面深色 |

文字、边框与深度：

| Token | 值 | 用途 |
|---|---:|---|
| `--text` | `#2b2117` | 标题、正文主色、边框 |
| `--text-mid` | `#5a4530` | Lead 与正文 |
| `--text-lt` | `#8a7455` | 元数据、Footer、禁用状态 |
| `--border` | `#2b2117` | 统一像素边框 |
| `--shadow` | `rgb(43 33 23 / 32%)` | 像素硬阴影 |
| `--shadow-soft` | `rgb(43 33 23 / 18%)` | 柔和阴影备用 |

本轮不得引入渐变文字、玻璃拟态、模糊背景或新的高饱和强调色。

### 5.3 字体 Token

| 字体 | 用途 |
|---|---|
| `DotGothic16` | 中文标题、Lead、正文、按钮 |
| `Silkscreen` | 品牌、Kicker、状态、序号、Footer |
| `VT323` | Release Tag、时间、像素数字 |
| `PingFang SC` / `Noto Sans CJK SC` / `system-ui` | 中文回退 |

现有本地 WOFF2 文件继续使用，不增加远程字体。

### 5.4 边框与阴影 Token

| Token | 值 |
|---|---:|
| `--border-thin` | `2px` |
| `--border-control` | `2.5px` |
| `--border-card` | `3px` |
| `--border-modal` | `4px` |
| `--shadow-control` | `2px 2px 0 var(--shadow)` |
| `--shadow-card` | `3px 3px 0 var(--shadow)` |
| `--shadow-hero` | `4px 4px 0 var(--shadow)` |
| `--shadow-modal` | `5px 5px 0 var(--shadow)` |

Landing 按钮与卡片继续使用 `--border-card` 和 `--shadow-card`。按压反馈保持 `translate(3px, 3px)` 后取消阴影。

## 6. 布局约束

- 页面最大内容宽度继续为 `1160px`。
- 页面横向 padding 继续使用 `clamp(20px, 5vw, 72px)`。
- Hero 继续使用 `1.2fr / 0.8fr` 两列布局，最小高度 `610px`。
- H1 继续使用 `clamp(42px, 6vw, 78px)`，移动端为 `clamp(40px, 12vw, 58px)`。
- Lead 最大宽度保持 `640px`，正文行高不低于 `1.7`。
- 三项能力在桌面端保持三列，在 `760px` 以下堆叠为单列。
- 新增产品判断模块桌面端采用约 `0.7fr / 1.3fr` 两列，移动端堆叠。
- 不增加嵌套卡片，不把新增段落包装成第四张功能卡。

## 7. 交互与响应式

- `/` 和 `/demo` 的现有 SPA 路由不变。
- Demo CTA 始终可用。
- APK CTA 根据 Release 数据保持现有可用或禁用状态。
- 页面继续自然滚动，不增加滚动劫持。
- `prefers-reduced-motion: reduce` 继续覆盖所有动画和过渡。
- 键盘焦点继续使用 `3px solid var(--butter)`。
- 移动端隐藏右上角状态，其他信息不可因适配而丢失。

## 8. 测试与验收

### 8.1 单元测试

更新 `LandingPage.test.tsx`，至少验证：

- 新 H1 可见。
- 在线 Demo 链接仍指向 `/demo`。
- 有 Release 时 APK 链接仍指向 `/api/download/android`。
- 无 Release 时显示 `APK 正在准备中`。
- 产品判断标题 `为什么是这个小东西` 可见。
- 三项能力的新标题均可见。

### 8.2 构建与端到端

- `npm test` 全部通过。
- `npm run build` 成功。
- Landing E2E 验证桌面和移动端首屏没有文字溢出。
- `/demo` 仍可直接访问和刷新。
- Release API 失败时 Landing 仍可使用在线 Demo。

### 8.3 文案验收

- H1 必须精确为 `让冰箱里的每一份食材，都有始有终。`
- 首屏不得出现 DashScope、通义千问、MQTT 或模型名称。
- 视觉识别不得描述为完全准确或已经成熟。
- 页面不得出现“重新定义”“颠覆”“智慧生活新纪元”等泛化表达。
- 新增产品判断正文总长度不超过 180 个中文字符。

## 9. 非目标

- 不重做品牌 Logo、冰箱像素插图或 Demo 产品 UI。
- 不增加产品截图轮播、视频背景或硬件 3D 模型。
- 不增加横向翻页、Scroll Snap、分页圆点或演示文稿式章节。
- 不引入新的字体、设计系统或颜色体系。
- 不修改 Image2、Release、BYOK 或 Android 后端能力。
