# 冰箱精灵 Web Demo v1.0.0 功能基线归一设计

Status: Approved for implementation

Date: 2026-07-25

Applies to:

- `https://fridge-elf-app.vercel.app/demo`
- `https://fridgeelf.rth1.xyz/demo`
- `/Users/ethan/workspace/projects/smart-tag-web-preview`
- Upstream `YantingShen-dev/fridge_app@v1.0.0`

## 1. 决策

Web Demo 的产品功能基线固定为：

```text
repository: https://github.com/YantingShen-dev/fridge_app.git
tag: v1.0.0
commit: 50364b2
source: apps/android/web
```

`v1.0.0` 的产品 UI、Golden Fixture 和完整状态机是唯一功能事实来源。Web
仓库保留 Landing Page、公开路由、无状态 Agent、Image2 BFF、Retinbox 静态
适配和比赛限流，但不得继续维护另一套独立产品实现。

Android 的 BYOK 凭据中心不是公开 Web Demo 的一部分。Web 访客不输入、查看或
持久化模型地址、模型名或密钥；这些配置只存在于 Vercel Production 环境变量。

## 2. 已确认的漂移

当前 Web Demo 最初主要来自 upstream `9552cdb`。与该提交共有的产品源码中，
58 个文件完全一致，4 个文件已有 Web 定制。

正式基线 `v1.0.0@50364b2` 在此后引入了显示屏、库存批次、数量修改、收藏食谱、
完整周计划、统一 Assistant、食谱插画、Profile 偏好和相关视觉状态。当前 Web
仓库与正式基线相比：

- 22 个产品源码文件仍完全一致；
- 40 个共同文件已经分叉；
- upstream 还有 26 个 Web Demo 未包含的产品源码文件。

两个云端入口都已部署 Web 仓库 `main@b0518f6`。问题不是 Vercel 与 Retinbox
互相漂移，而是 Web 仓库没有跟随正式产品 Release。

## 3. 目标

完成后，两个公开 `/demo` 必须：

1. 呈现 `v1.0.0` 的完整五标签产品体验；
2. 使用 `v1.0.0` 的 Golden Fixture、视觉语言和状态机；
3. 支持库存批次、数量修改、采购清单、收藏、周计划、显示屏和 Profile；
4. 使用共享无头网关提供只读 Recipe Agent 与今日推荐；
5. 使用共享 Image2 网关提供四风格食谱插画；
6. 不显示 BYOK、供应商、Base URL、模型或密钥配置；
7. 不把访客的 Demo 世界、Profile、收藏、规划或对话写入持久存储；
8. 刷新、退出或点击“重新开始 Demo”后恢复初始世界；
9. 在 Vercel 与 Retinbox 上通过相同的功能旅程。

## 4. 非目标

本次不做：

- Android NativeBridge、MQTT、固件或协议 v1 改造；
- 账户、跨设备同步、数据库、KV 或长期对话记忆；
- 浏览器 BYOK 或 Credential Center；
- 自动执行 Agent 工具调用；
- Agent 直接修改库存、采购、收藏、规划、Profile 或显示屏；
- 将两个 Git 仓库重构为 monorepo、submodule 或共享 npm package；
- 将本次冲刺扩展到 `v1.0.0` 之后的本地未提交 Android 开发状态。

## 5. 源码所有权

迁移后源码分为三个边界。

### 5.1 Upstream 产品层

以下内容以 `v1.0.0/apps/android/web` 为基线：

- `src/app/`
- `src/catalog/`
- `src/components/`
- `src/fixtures/`
- `src/scenes/`
- `src/styles/`
- 产品级 E2E 旅程与视觉状态

除明确列入 Web 覆盖清单的文件外，这些文件应保持与锁定 Release 一致。

### 5.2 Web Demo 适配层

Web 专属代码负责：

- 构造无状态 Demo Runtime；
- 将 Release `AssistantPort` 接到 `/api/demo/agent`；
- 将今日推荐接到 `/api/demo/recommend`；
- 将 Release `RecipeIllustrationPort` 接到 `/api/illustrate`；
- 提供始终可用但不可配置的托管能力状态；
- 将 Profile、收藏、规划和库存状态放入内存 Store；
- 处理匿名会话、Retinbox BFF origin 和 Fixture 回退。

这些代码不得包含上游模型地址或密钥。

### 5.3 Web 发布层

以下现有能力保持独立：

- `src/RootApp.tsx`
- `src/LandingPage.tsx`
- `api/demo/*`
- `api/illustrate.ts`
- `api/releases/*`
- Vercel 路由与安全 Header
- Retinbox 自包含静态构建

Landing Release 元数据与 `/demo` 产品源码仍是两条独立链路。Landing 读取
Release 只控制 APK 信息，不能被当作 Demo 已完成基线同步的证据。

## 6. 基线锁

仓库增加机器可读的基线文件：

```json
{
  "repository": "https://github.com/YantingShen-dev/fridge_app.git",
  "tag": "v1.0.0",
  "commit": "50364b2",
  "sourcePath": "apps/android/web"
}
```

同步脚本只接受显式 tag 和 commit，并生成 upstream 产品文件摘要。CI 必须验证：

- 基线文件中的 tag 与 commit 非空且格式合法；
- 产品文件摘要与锁文件一致；
- 所有 Web 覆盖文件都在允许清单中；
- 没有未声明的产品层漂移。

主仓库当前是私有仓库，因此普通公开 CI 不依赖远端读取权限。基线升级由已认证
的维护者显式执行同步脚本，再连同新 tag、commit 和摘要一起提交。这样发布构建
是确定的，不受私有仓库可用性影响。

## 7. Demo Runtime

### 7.1 运行时端口

Web Demo 使用 Release 已定义的端口形状：

```ts
interface DemoRuntime {
  inventory: InventoryPort
  assistant: AssistantPort
  recipeIllustration: RecipeIllustrationPort
  speech: SpeechPort
  display: DisplayPort
  capabilities: DemoCapabilityPort
  stateStore: DemoStateStore
  mode: 'browser-mock'
}
```

`DemoCapabilityPort` 只表达“托管 Agent”和“托管 Image2”是否可用，不接受
Provider、Base URL、模型或密钥写入。

`DemoStateStore` 是一次页面生命周期内的内存键值存储。它为库存、Profile、
收藏、规划和显示屏状态提供与现有加载函数兼容的读写接口，但不代理
`localStorage`、IndexedDB、Cookie 或远程存储。

### 7.2 初始世界与重置

每次进入 `/demo`：

1. 创建新的 `DemoStateStore`；
2. 从 `v1.0.0` Golden Fixture 构造库存、采购、收藏、规划和 Profile；
3. 创建新的 Demo Runtime；
4. 渲染 Release App。

“重新开始 Demo”销毁当前 Runtime 和 Store，并使用递增 React key 重新挂载。
刷新和重新进入页面天然创建新世界。

匿名 API Token 继续保存在 `sessionStorage`，因为它只承担两小时 BFF 访问证明，
不属于用户世界或对话记忆。

## 8. Agent 与推荐

### 8.1 Recipe Agent

Release Recipe Scene 的输入框和结果 Modal 保持不变。提交问题时：

```text
Release Recipe Scene
  -> DemoAssistantPort
  -> buildDemoWorldSnapshot
  -> POST /api/demo/agent
  -> Vercel BFF
  -> headless text gateway
```

`DemoAssistantPort` 把现有 `DemoAgentResponse` 映射为 Web
`DemoAssistantReply`。该类型复用 Release `AssistantReply` 的 `answer`，并额外
保存服务端已验证的现有 `recipeId`。结果 Modal 继续使用 Release 外壳和
`RecipeMini`，只为这些现有食谱提供详情入口。首版不创建模型生成的可持久化
食谱，不自动添加采购项。

### 8.2 今日推荐

Web Demo 使用 Release Recipe Scene 已有的 `onOpenAi` 扩展点增加“今日推荐”
入口。点击后请求 `/api/demo/recommend`，并在标准 Modal 中展示结果。该入口是
允许的 Web 覆盖，不改变其他 Release 布局。

推荐中的 `recipeId` 必须存在于当前 `availableRecipes`。未知 ID 只显示文字，
不能打开详情或触发状态更新。

### 8.3 写操作边界

LLM 请求始终只读。模型响应不得直接 dispatch action，也不得返回工具调用。

用户可以在现有 UI 中主动修改本地游戏状态，例如：

- 添加或取出 Fixture 食材；
- 修改数量；
- 勾选采购项；
- 收藏现有食谱；
- 调整周计划；
- 修改 Profile；
- 更新模拟显示屏。

这些操作来自用户交互，不来自 Agent 自动执行，并且只影响内存 Store。

浏览器中的语音库存与语音采购继续使用确定性 Fixture 解析，不调用在线 Agent，
避免模型输出进入写路径。

## 9. Image2

Release `RecipeIllustrationPanel` 的视觉结构、四个 canonical style ID、分页
规划和结果 UI 保持不变。它原有的 Credential gate 是明确的 Web 覆盖点，替换
为只读的 `DemoCapabilityPort`。

`DemoRecipeIllustrationPort` 将 Release job 接口适配到同步单页
`POST /api/illustrate`：

1. 根据 `RecipeIllustrationRequestV1` 计算所需页码；
2. 为每页发起一次结构化请求；
3. 在浏览器内维护短时 job 状态；
4. 将 PNG 转为仅当前页面有效的 Blob URL；
5. 返回 Release `RecipeIllustrationJob`；
6. 重置或卸载时撤销全部 Blob URL。

插画能力在 Demo 中视为托管能力，不读取 CredentialPort，不显示“去配置”或密钥
状态。Credential Center 源码不进入 Web 生产 bundle。上游失败时显示现有友好
错误，并保留重新生成单页的入口。

## 10. Profile

Profile 保留：

- 居住模式；
- 口味偏好；
- 健身选择；
- 常规选择；
- 健康、过敏和忌口；
- 临期提醒、摄像头、夜间省电和 Agent 开关。

Profile 删除：

- 密钥配置卡片；
- Credential Center；
- Provider、模型和 Base URL 状态；
- 配置引导跳转。

Profile 数据只写入 `DemoStateStore`。健康文本默认不发送给模型；只有在用户主动
发起 Recipe Agent 或今日推荐时，才将受长度限制的口味、目标、居住模式和健康
摘要加入当前请求，且服务端不记录这些内容。

## 11. 错误处理

Agent、推荐和 Image2 继续采用现有边界：

- 匿名会话失败：显示 Fixture 回退；
- 网络、超时或 `5xx`：显示友好错误并允许重试；
- `429`：显示访问频繁文案；
- 非法模型 JSON：服务端清洗为 `502`；
- 未知食谱 ID：忽略导航能力；
- Image2 部分页面失败：保留已成功页面，可单页重试；
- Runtime 适配器异常：不影响其他本地状态机；
- 重置期间仍在进行的请求：通过 AbortController 取消并忽略迟到结果。

错误文案不得暴露 Provider、模型、上游地址、Prompt、Token 或密钥。

## 12. 部署架构

```text
Vercel /demo
  -> Vite static app
  -> same-origin /api/demo/* and /api/illustrate

Retinbox /demo
  -> self-contained static app
  -> cross-origin https://fridge-elf-app.vercel.app/api/*

Vercel Functions
  -> headless text gateway
  -> headless Image2 gateway
```

两个前端构建必须来自同一个 Web commit。Retinbox 允许使用不同的打包形态，但
产品源码、基线锁和测试结果必须相同。

## 13. 测试策略

### 13.1 基线测试

- 验证基线文件固定 `v1.0.0@50364b2`；
- 验证 upstream 文件摘要；
- 拒绝未声明的产品层覆盖；
- 验证 Golden Fixture 身份、数量和日期。

### 13.2 Runtime 单元测试

- 新会话从完整 Fixture 开始；
- 库存批次、数量、收藏、规划、Profile 和显示屏状态在会话内可更新；
- 新 Runtime 不读取前一个 Runtime 的状态；
- 浏览器持久存储中不存在 Demo 世界；
- 重置恢复全部初始状态；
- 重置取消请求并撤销 Blob URL。

### 13.3 Agent 合约测试

- Agent 和推荐收到当前库存、临期、规划、缺货与受限偏好；
- 输出不能直接 dispatch；
- 只允许已存在的 `recipeId`；
- 未知字段、工具调用和动作字段被忽略；
- 语音写路径不调用在线 Agent；
- 失败和限流回退不改变 Demo 世界。

### 13.4 Image2 合约测试

- Release V1 请求正确映射到每页 `/api/illustrate`；
- 四个 canonical style ID 保持不变；
- 多页 job、部分失败、单页重试和 Blob 回收正确；
- UI 不出现 BYOK 或配置密钥文案。

### 13.5 浏览器旅程

Vercel 和 Retinbox 运行同一组旅程：

1. 进入厨房并打开冰箱；
2. 查看、添加、修改和移除库存批次；
3. 更新采购清单；
4. 收藏食谱并加入周计划；
5. 使用 Recipe Agent；
6. 使用今日推荐；
7. 生成至少一种食谱插画；
8. 更新显示屏；
9. 修改 Profile；
10. 重新开始并验证世界完全复位。

视觉测试覆盖 Release 已命名状态，并增加 Agent、今日推荐、插画和无 BYOK
Profile 状态。

## 14. Release 接口独立问题

线上 `/api/releases/latest` 当前返回 `NO_RELEASE`，Landing 显示的
`Fridge Elf v1.0.0` 是 fallback。该问题不阻塞 Demo 功能基线迁移，但必须作为
独立任务修复私有 GitHub Release 的访问权限或 Token scope。

Demo 基线是否正确只由本仓库的基线锁、产品文件摘要和测试决定，不能依赖
Landing 是否成功显示 APK。

## 15. 完成标准

满足以下条件才视为完成：

- Web 产品功能与 `v1.0.0@50364b2` 对齐；
- 所有允许的 Web 覆盖都记录在基线锁中；
- `/demo` 不出现 BYOK、Credential Center 或密钥配置入口；
- Demo 世界无持久化，刷新和重置均恢复初始状态；
- Agent 与推荐只读且使用当前 mock 世界；
- Image2 使用 Release 四风格 UI 和现有 Vercel BFF；
- 单元、合约、构建、Retinbox HTML 和双站浏览器旅程通过；
- Vercel 与 Retinbox 都部署同一 Web commit；
- 浏览器 bundle 中不存在无头网关地址或密钥。
