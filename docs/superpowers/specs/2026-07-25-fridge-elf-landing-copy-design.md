# 冰箱精灵 Landing Page 长页叙事与动效设计规格

日期：2026-07-25

状态：待用户最终审阅

范围：`/` Landing Page

不涉及：`/demo` 产品功能改造、API、部署架构、Android 与固件能力

## 1. 目标

将现有 Landing Page 扩展为一张内容完整、可持续向下浏览的产品长页。

页面需要同时完成四件事：

1. 从牛奶、鸡蛋、临期食材和买菜等家庭经验切入，让普通用户立即理解问题。
2. 解释食材从购买、录入、存放、提醒、做饭、采购到再次入库的完整生命周期。
3. 清楚呈现 T5AI 冰箱终端、Android 手机应用、Wi-Fi 与 MQTT 组成的家庭 IoT 系统。
4. 在页面后段自然引出“家庭实体数据”和 Ubiquitous AI 的产品判断。

首屏文字保持平实、细腻。页面通过原创 SVG、滚动节奏和克制动效建立黑客松作品应有的完成度。

## 2. 受众与叙事原则

第一读者是黑客松评委与潜在合作方，第二读者是普通家庭用户。

文案原则：

- 先讲生活，再讲系统。
- 先解释食材怎样被照看，再出现 IoT、AIoT 和 Ubiquitous AI。
- 不使用融资路演语气、行业黑话或连续短口号。
- 不使用未经验证的数据。
- 视觉识别可以演示，但必须标注仍在持续完善。
- 技术栈用于建立可信度，不占据 Hero。
- 页面可以长，但每一节只回答一个清晰问题。

视觉原则：

- 保留当前像素品牌、奶油底色、珊瑚主色与硬边框。
- 不参考演示文稿、电子杂志或 guizang 布局。
- 不增加 WebGL、渐变文字、玻璃拟态或写实 3D。
- 动效来自产品对象本身，例如冰箱漂浮、信号流动、流程连线和状态变化。
- 页面有柔和“翻页感”，但不能劫持滚轮或阻止自然阅读。

## 3. 页面结构

页面使用自然纵向长滚动，共十个内容区域：

1. Header
2. Hero：产品承诺
3. 日常问题：食材怎样被遗忘
4. 食材全生命周期
5. 家庭 IoT：开发板与 Android 同步
6. 多模态入口：语音、视觉、触摸、文字
7. 三项核心能力
8. 家庭实体数据
9. Ubiquitous AI：从冰箱走向其他家庭场景
10. Release、最终 CTA 与 Footer

桌面端：

- Hero、食材生命周期、家庭实体数据、最终 CTA 使用接近一屏的章节尺寸。
- 其他章节使用 `70vh` 到 `90vh` 的内容高度。
- 关键章节使用 `scroll-snap-align: start`。
- 页面容器使用 `scroll-snap-type: y proximity`，不得使用 `mandatory`。

移动端：

- 完全关闭 Scroll Snap。
- 保持自然滚动和内容顺序。
- 所有双列、流程图与设备关系图改为纵向排列。

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

状态：

```text
DEMO ONLINE
```

桌面端增加简短锚点导航：

```text
食材的一生
家庭 IoT
多模态
为什么
体验
```

移动端不显示锚点导航。

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
2. 次按钮：有正式版本时显示 `下载 Android APK`
3. 没有正式版本时显示不可点击的 `APK 正在准备中`

辅助说明：

```text
语音、视觉、触摸与手机同步。视觉识别仍在持续完善。
```

Hero 右侧使用新的可动冰箱 SVG，替换当前纯 CSS 冰箱。

### 4.3 日常问题

Kicker：

```text
一些很普通、也很常见的时刻
```

标题：

```text
有些食材，只是慢慢被挡在了冰箱后面。
```

正文：

```text
买菜那天还记得很清楚。几天以后，牛肉被新的袋子挡住，鸡蛋只剩几个也没人确定。直到再次采购，或者准备做饭时翻遍冰箱，我们才重新想起它们。
```

四个具体问题：

```text
看不见还剩多少
想不起哪天买的
出门后无法确认
临期时没有提醒
```

这一节不使用四张独立卡片。四个问题沿冰箱层架 SVG 分布，随滚动依次出现。

### 4.4 食材全生命周期

锚点：`lifecycle`

Kicker：

```text
FOOD LIFECYCLE
```

标题：

```text
从买回来，到用掉，再回到下一次采购。
```

正文：

```text
食材不是录入一次就结束了。冰箱精灵把购买、存放、提醒、做饭和补货接在一起，让每一次变化都能继续为下一步所用。
```

六个阶段：

| 阶段 | 标题 | 说明 |
|---|---|---|
| 01 | 买回家 | 新食材进入家庭 |
| 02 | 被记录 | 语音、视觉、触摸或手机录入 |
| 03 | 被照看 | 批次、余量与保质期持续更新 |
| 04 | 变成一餐 | AI 根据库存提供菜谱与三餐建议 |
| 05 | 缺货采购 | 缺少的材料进入采购清单 |
| 06 | 再次入库 | 购买完成后回到下一轮库存 |

章节收束：

```text
这是食材的完整生命周期，也是一份会继续流动的数据。
```

### 4.5 家庭 IoT

锚点：`iot`

Kicker：

```text
HOME AIoT · ONE SHARED INVENTORY
```

标题：

```text
冰箱旁和手机上，始终是同一份库存。
```

正文：

```text
在家时，可以直接对冰箱旁的 T5AI 终端说一句，或者在触摸屏上完成操作。出门买菜时，Android 手机仍能看到家里还有什么。两端通过 Wi-Fi 与 MQTT 同步，家庭成员看到的是同一份实时信息，也共同组成一套贴近日常使用的家庭 AIoT。
```

系统标签：

```text
T5AI 触屏终端
Android 手机应用
Wi-Fi / MQTT
家庭共享库存
```

本节需要明确出现 `IoT`，但不展示供应商服务、模型名称或复杂网络架构。

### 4.6 多模态入口

锚点：`multimodal`

Kicker：

```text
VOICE · VISION · TOUCH · TEXT
```

标题：

```text
手上拿着东西时，可以直接开口说。
```

正文：

```text
想确认细节时可以触摸，手机上也可以慢慢编辑。视觉识别已经进入 Demo；在它还不够完善的地方，语音、触摸和文字会继续接住你。
```

四种入口：

| 模态 | Microcopy |
|---|---|
| 语音 | “帮我放一盒酸奶和六个鸡蛋。” |
| 视觉 | 让摄像头看见刚刚放入的食材 |
| 触摸 | 在冰箱旁直接确认数量与批次 |
| 文字 | 在手机上完整编辑、搜索与规划 |

视觉识别标签：

```text
AVAILABLE IN DEMO · STILL IMPROVING
```

### 4.7 三项核心能力

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

#### 03 · 家庭信息

标题：

```text
冰箱也可以成为家里的留言处
```

正文：

```text
便签、三餐、日历和食物清单都能留在冰箱屏幕上。它既照看食材，也接住家人在厨房里需要看见的信息。
```

双端同步已由 IoT 章节完整解释，不在此处重复作为第三张卡片。

### 4.8 家庭实体数据

锚点：`why`

Kicker：

```text
PHYSICAL DATA AT HOME
```

标题：

```text
家里的东西，也应该留下可以继续使用的信息。
```

正文：

```text
聊天记录很容易搜索，菜市场买回来的菜却很少留下什么。家里总要有人记得牛奶什么时候买、鸡蛋还剩多少、那袋牛肉是不是该先吃。

冰箱精灵关心的并不只是一张库存清单。它想让真实物品在进入和离开时留下信息，让家庭中的实体数据也能被看见、被理解，并在下一次做饭或采购时继续发挥作用。
```

该节以较安静的全宽排版呈现，不使用大引用、数据大字报或强对比口号。

### 4.9 Ubiquitous AI

Kicker：

```text
UBIQUITOUS AI · A QUIET INTERFACE
```

标题：

```text
今天先从冰箱开始。
```

正文：

```text
这个小终端不需要成为家里又一台被学习和照顾的设备。它只是待在物品经过的地方，听见、看见、记住，然后在需要时回应。

今天它在冰箱旁，理解食材的流转。今后，同样的方式也可以走到衣柜或药柜旁边。终端慢慢退到环境里，生活本身成为与智能交互的入口。
```

场景标签：

```text
冰箱 · 食材
衣柜 · 衣物
药柜 · 药品
```

### 4.10 Release 与最终 CTA

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

最终 CTA 标题：

```text
先看看它怎样照看一颗鸡蛋。
```

最终 CTA 正文：

```text
从放进冰箱、更新数量，到被提醒、做成一餐，再回到下一次采购。
```

按钮：

```text
体验完整 Demo
获取 Android APK
查看最新 Release
```

Footer：

```text
FRIDGE ELF · ADVX 2026
HACKATHON DEMO · WORK IN PROGRESS
```

## 5. 原仓库 Design Token

### 5.1 Token 来源

以下文件继续作为唯一视觉来源：

- `src/styles/tokens.css`
- `src/styles/pixel.css`
- `src/styles/fonts.css`
- `src/styles/global.css`
- `src/LandingPage.css`

颜色与字体不得建立第二套系统。新增动效只允许增加时间与缓动 Token。

### 5.2 背景与面板

| Token | 值 |
|---|---:|
| `--bg-page` | `#c8c0a8` |
| `--bg-cream` | `#ebdcb4` |
| `--bg-warm` | `#dcc89e` |
| `--panel` | `#f5eac8` |
| `--panel-2` | `#e8d5a8` |
| `--panel-3` | `#fbf3db` |

### 5.3 品牌与场景色

| Token | 值 |
|---|---:|
| `--mustard` | `#d9a868` |
| `--mustard-dk` | `#b88848` |
| `--navy` | `#4a6b8f` |
| `--navy-dk` | `#2e4b6b` |
| `--navy-lt` | `#6b8fb0` |
| `--sage` | `#7a9968` |
| `--sage-dk` | `#5a7a4b` |
| `--sage-lt` | `#a8c08a` |
| `--coral` | `#d96b4f` |
| `--coral-dk` | `#b04a32` |
| `--butter` | `#e8b84a` |
| `--butter-lt` | `#f5d078` |
| `--peach` | `#e89870` |
| `--rose` | `#c86b7a` |
| `--wall` | `#c8bfa5` |
| `--floor` | `#e8dbc4` |
| `--floor-dk` | `#b89877` |

### 5.4 文字与深度

| Token | 值 |
|---|---:|
| `--text` | `#2b2117` |
| `--text-mid` | `#5a4530` |
| `--text-lt` | `#8a7455` |
| `--border` | `#2b2117` |
| `--shadow` | `rgb(43 33 23 / 32%)` |
| `--shadow-soft` | `rgb(43 33 23 / 18%)` |

### 5.5 字体

| 字体 | 用途 |
|---|---|
| `DotGothic16` | 中文标题、Lead、正文、按钮 |
| `Silkscreen` | 品牌、Kicker、状态、序号、Footer |
| `VT323` | Release Tag、时间、像素数字 |
| `PingFang SC` / `Noto Sans CJK SC` / `system-ui` | 中文回退 |

继续使用仓库内 WOFF2，不增加远程字体。

### 5.6 边框与阴影

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

### 5.7 新增 Motion Token

Motion Token 只在 Landing 作用域内定义：

```css
--landing-motion-fast: 180ms;
--landing-motion-medium: 420ms;
--landing-motion-slow: 720ms;
--landing-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--landing-ease-soft: cubic-bezier(0.22, 1, 0.36, 1);
--landing-float-cycle: 5.8s;
```

## 6. SVG 视觉系统

### 6.1 共通规则

- 使用内联 React SVG，不依赖远程图片。
- 使用现有 Token 通过 CSS 变量着色。
- 线条使用 `var(--border)`，主轮廓为 `3px` 到 `5px`。
- 小尺寸元素使用 `shape-rendering: crispEdges`。
- 不使用渐变、滤镜模糊、写实阴影或复杂纹理。
- 每个信息型 SVG 必须包含 `<title>` 和 `<desc>`。
- 纯装饰 SVG 使用 `aria-hidden="true"`。

### 6.2 Hero 冰箱 SVG

用途：替换现有 CSS 冰箱，成为页面主要品牌对象。

组成：

- 奶油色冰箱主体
- 深蓝显示屏
- 珊瑚与鼠尾草磁贴
- 芥末色把手
- `MILK · 2D` 便签
- 小型库存状态点

动效：

- 整体以 `5.8s` 周期上下漂浮 `6px`。
- 旋转范围不超过 `1deg`。
- Hover 时冰箱轻微抬起，磁贴移动 `1px` 到 `2px`。
- 显示屏状态点以低频率闪烁。
- 页面不可见时暂停连续动画。

### 6.3 冰箱层架 SVG

用途：承载四个日常问题。

组成：

- 两层冰箱隔板
- 牛奶、鸡蛋、蔬菜与被挡住的牛肉
- 四个短说明与对应物品连接

动效：

- 进入视口时，后排食材从轻微低透明度恢复。
- 四条说明按阅读顺序出现。
- 不模拟腐烂、异味或夸张警告。

### 6.4 生命周期 SVG

用途：展示六阶段闭环。

组成：

- 六个节点
- 一条从购买到再次入库的闭合路径
- 简化图标：购物袋、录入、冰箱、餐盘、采购清单、重新入库

动效：

- 路径随章节进入逐段绘制。
- 节点按 01 到 06 顺序点亮。
- Hover 单个节点时，只提升该节点与相邻路径。
- 移动端改为纵向时间线，不保持环形。

### 6.5 IoT 同步 SVG

用途：展示开发板、手机和共享库存的关系。

组成：

- 左侧 T5AI 终端
- 中央共享库存
- 右侧 Android 手机
- Wi-Fi 与 MQTT 标签

动效：

- 小型数据方块沿连接线双向移动。
- 修改数量时，两个屏幕上的数字同步变化。
- 连续信号动画只在该章节可见时运行。

### 6.6 多模态 SVG

用途：展示四种输入方式。

组成：

- 中央冰箱精灵状态
- 语音、视觉、触摸、文字四个节点

动效：

- 节点进入时依次点亮。
- Hover 或键盘聚焦时，中央状态切换到对应示例。
- 视觉节点固定带有“实验中”标记。

### 6.7 家庭场景 SVG

用途：解释 Ubiquitous AI 的可泛化方向。

组成：

- 冰箱
- 衣柜
- 药柜
- 三个相同形态的小终端

动效：

- 滚动进入时，三个终端依次亮起。
- 不绘制复杂云端网络，不制造“万物互联”宣传图。

## 7. 滚动与动效设计

### 7.1 翻页感

- 桌面页面使用 `scroll-snap-type: y proximity`。
- Hero、生命周期、家庭实体数据和最终 CTA 使用 `scroll-snap-align: start`。
- 不监听并覆盖滚轮事件。
- 不使用强制分页或固定一屏只显示一节。
- Header 锚点使用原生平滑滚动。

### 7.2 章节进入

使用一个共享 `IntersectionObserver` 管理：

- `data-reveal="up"`：从下方 `18px` 进入。
- `data-reveal="left"`：从左侧 `24px` 进入。
- `data-reveal="right"`：从右侧 `24px` 进入。
- `data-reveal="line"`：SVG 路径绘制。
- 同一组 stagger 间隔控制在 `70ms` 到 `110ms`。

文字只做一次进入，不循环漂浮，不逐字弹跳。

### 7.3 悬浮与视差

- Hero 冰箱允许持续轻微漂浮。
- 装饰小图形允许 `2px` 到 `5px` 的低速视差。
- 卡片 Hover 只使用现有硬阴影与 `translate`。
- 按钮保持现有像素按压反馈。
- 不对长段正文使用视差。

### 7.4 页面进度

桌面右侧显示窄型章节进度轨道：

- 只显示 5 个语义节点：Hero、生命周期、IoT、为什么、体验。
- 当前节点使用 `--coral`。
- 其他节点使用透明底与 `--border` 描边。
- 轨道不遮挡正文，不在移动端显示。

## 8. 性能与可访问性

- SVG 组件按页面源代码内联，不额外请求大图。
- 所有连续动画在离开视口或页面隐藏时暂停。
- 使用同一个 `IntersectionObserver`，不为每个元素创建独立观察器。
- 不引入重量级动效库。
- `prefers-reduced-motion: reduce` 时：
  - 关闭 Scroll Snap。
  - 关闭漂浮、视差、路径绘制与信号循环。
  - 所有内容直接显示最终状态。
- 信息型 SVG 必须有可读名称。
- 状态不能只依赖颜色表达。
- Header 锚点、按钮与互动节点必须支持键盘操作。
- 焦点样式继续使用 `3px solid var(--butter)`。

## 9. 响应式约束

- 页面最大内容宽度继续为 `1160px`。
- 横向 padding 继续使用 `clamp(20px, 5vw, 72px)`。
- Hero 桌面保持 `1.2fr / 0.8fr`。
- H1 桌面使用 `clamp(42px, 6vw, 78px)`。
- H1 移动端使用 `clamp(40px, 12vw, 58px)`。
- `760px` 以下：
  - 关闭 Scroll Snap。
  - 隐藏 Header 锚点与右侧进度。
  - 双列内容改为单列。
  - 生命周期环形 SVG 改为纵向时间线。
  - IoT 设备改为上、中、下排列。
  - 连续漂浮幅度降为 `3px`，低动态模式下完全关闭。

## 10. 组件边界

建议拆分：

```text
LandingPage
├── LandingHeader
├── HeroSection
│   └── FridgeHeroSvg
├── ProblemSection
│   └── FridgeShelfSvg
├── LifecycleSection
│   └── LifecycleSvg
├── IoTSection
│   └── DeviceSyncSvg
├── MultimodalSection
│   └── MultimodalSvg
├── FeatureSection
├── PhysicalDataSection
├── UbiquitousSection
│   └── HomeScenesSvg
├── ReleaseSection
├── FinalCta
└── LandingFooter
```

共享能力：

- `useLandingReveal`：章节进入观察。
- `usePageVisibility`：暂停连续 SVG 动画。
- `LandingSection`：统一宽度、锚点、Snap 与 reveal 属性。

## 11. 测试与验收

### 11.1 单元测试

至少验证：

- H1 精确为 `让冰箱里的每一份食材，都有始有终。`
- 页面存在 `FOOD LIFECYCLE` 和 `HOME AIoT`。
- 生命周期六个阶段顺序正确。
- IoT 文案包含 `T5AI`、`Android`、`Wi-Fi` 和 `MQTT`。
- 视觉识别显示“仍在持续完善”或“实验中”。
- Demo 链接仍指向 `/demo`。
- 有 Release 时 APK 链接仍指向 `/api/download/android`。
- 无 Release 时显示 `APK 正在准备中`。
- 五个 SVG 组件均存在可访问名称。

### 11.2 动效测试

- IntersectionObserver 不可用时，内容默认可见。
- `prefers-reduced-motion` 下不存在无限动画。
- 页面隐藏后连续动画暂停。
- 桌面存在 `scroll-snap-type: y proximity`。
- 移动端媒体查询关闭 Scroll Snap。

### 11.3 构建与端到端

- `npm test` 全部通过。
- `npm run build` 成功。
- Landing E2E 验证桌面与移动端没有文字、SVG 或进度轨道溢出。
- `/demo` 仍可直接访问和刷新。
- Release API 失败时在线 Demo 仍可使用。
- 更新 Landing 的桌面与移动端视觉快照。

### 11.4 文案验收

- Hero 不出现 DashScope、通义千问、MQTT 或模型名称。
- IoT 章节必须明确出现 `IoT`、`Wi-Fi` 与 `MQTT`。
- 生命周期必须覆盖购买、录入、存放、提醒、做饭、采购和再次入库。
- 视觉识别不得描述为完全准确或已经成熟。
- 页面不得出现“重新定义”“颠覆”“智慧生活新纪元”等泛化表达。

## 12. 非目标

- 不重做 `/demo` 内部产品 UI。
- 不使用 guizang、网页 PPT 或横向翻页模板。
- 不增加 WebGL、视频背景、粒子系统或 3D 模型。
- 不新增远程字体、外部插画库或重量级动效依赖。
- 不修改 Image2、Release、BYOK、Android 或固件能力。
