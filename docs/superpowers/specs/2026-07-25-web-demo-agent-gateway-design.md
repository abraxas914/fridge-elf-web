# 冰箱精灵 Web Demo 无状态 Agent Gateway 设计

Status: Approved for implementation

Date: 2026-07-25

Applies to:

- `https://fridge-elf-app.vercel.app/demo`
- `https://fridgeelf.rth1.xyz/demo`
- `/Users/ethan/workspace/projects/smart-tag-web-preview`

## 1. 目标

两个公开 Demo 必须共享同一套只读、无状态 AI 能力：

- AI 食谱推荐；
- Recipe Agent 对话；
- 四风格食谱插画。

现有 `goldenFixture`、Reducer 和场景状态机继续作为 Demo 世界的事实来源。
刷新或关闭页面后允许重新开始，不创建账户、不保存长期用户档案、不建立对话
记忆。

LLM 只能读取当前模拟世界快照并返回答案、推荐或图片。模型输出不得直接修改
库存、采购、三餐规划、Profile、便签或设备状态。

## 2. 部署决策

Retinbox 是纯静态部署，不能运行私密 Serverless Function。两个 Demo 因此共用
Vercel BFF：

```text
fridge-elf-app.vercel.app/demo
  -> same-origin /api/demo/*

fridgeelf.rth1.xyz/demo
  -> cross-origin https://fridge-elf-app.vercel.app/api/demo/*

Vercel BFF
  -> headless text gateway
  -> headless image gateway
```

Retinbox bundle 可以包含公开的 Vercel BFF origin，因为该地址必然出现在浏览器
网络面板。它不得包含无头网关地址、网关 Token 或供应商密钥。

## 3. 环境变量

本地变量保存在未提交的 `.env.local`。远端变量只配置到 Vercel Production，
不配置到 Retinbox 或 GitHub：

```text
HEADLESS_GATEWAY_BASE_URL
HEADLESS_GATEWAY_API_KEY
HEADLESS_GATEWAY_DEFAULT_MODEL
HEADLESS_GATEWAY_MODELS
HEADLESS_IMAGE_GATEWAY_BASE_URL
HEADLESS_IMAGE_GATEWAY_API_KEY
HEADLESS_IMAGE_GATEWAY_MODEL
IMAGE_API_ENDPOINT
IMAGE_API_KEY
DEMO_SESSION_SECRET
```

变量不得使用 `VITE_` 前缀。前端代码只能认识 Vercel BFF 的公开 origin。

当前文本网关为公网 HTTP。比赛阶段接受 Vercel Function 到网关之间没有 TLS 的
临时风险，但密钥仍不得进入浏览器、响应、日志、仓库或 Retinbox 构建。

## 4. 匿名会话

`POST /api/demo/session` 创建 1–2 小时有效的签名匿名会话：

```json
{
  "token": "opaque-signed-token",
  "expiresAt": "2026-07-25T16:00:00.000Z"
}
```

会话 Token 包含随机 session ID、过期时间和 HMAC，不需要数据库。浏览器将其
保存到 `sessionStorage`。Token 只证明请求来自一次短时 Demo 会话，不代表用户
身份。

Retinbox 跨域请求使用 `Authorization: Bearer <token>`，避免依赖第三方 Cookie。

## 5. 浏览器 API

公开路由：

```text
POST /api/demo/session
POST /api/demo/agent
POST /api/demo/recommend
POST /api/illustrate
```

允许的 Origin：

```text
https://fridge-elf-app.vercel.app
https://fridgeelf.rth1.xyz
http://127.0.0.1:5173
http://localhost:5173
```

Serverless Function 必须正确响应 CORS preflight，只向匹配的 Origin 回写
`Access-Control-Allow-Origin`，并包含 `Vary: Origin`。

Vercel 部署使用相对 `/api/*`。Retinbox 部署使用固定公开 origin
`https://fridge-elf-app.vercel.app`。

## 6. Demo 世界快照

客户端构造裁剪后的只读快照：

```ts
interface DemoWorldSnapshot {
  inventory: Array<{
    name: string
    quantity: string
    category: string
    expiryLevel: 'normal' | 'soon' | 'urgent'
  }>
  plannedMeals: Array<{
    day: string
    meal: 'dinner'
    recipeName: string
  }>
  missingItems: string[]
  availableRecipes: Array<{
    id: string
    name: string
  }>
  preferences?: {
    taste?: string[]
    healthGoal?: string
    householdMode?: string
  }
}
```

请求不包含完整 UI state、历史对话、浏览器配置、设备信息或身份信息。首版
Profile 偏好可以省略，避免将健康输入默认发送。

## 7. Agent 和推荐契约

Agent 请求：

```json
{
  "message": "今晚吃什么比较好？",
  "snapshot": {}
}
```

推荐请求：

```json
{
  "snapshot": {}
}
```

统一结构化响应：

```ts
interface DemoAgentResponse {
  answer: string
  suggestions?: Array<{
    title: string
    reason: string
    recipeId?: string
  }>
  notices?: string[]
}
```

前端只允许已存在于 `RECIPES` 的 `recipeId` 导航到详情。未知 ID、工具调用、动作
字段或额外代码全部忽略。

## 8. 上游文本请求

Vercel BFF 将请求转换为 OpenAI-compatible non-streaming chat completion：

```text
POST <HEADLESS_GATEWAY_BASE_URL>/v1/chat/completions
Authorization: Bearer <HEADLESS_GATEWAY_API_KEY>
```

默认模型由 `HEADLESS_GATEWAY_DEFAULT_MODEL` 指定，首版为 `gpt-5.4`。

System Prompt 固定在服务端，要求：

- 只使用给定快照；
- 不声称访问真实设备；
- 不返回写操作或工具调用；
- 只输出约定 JSON；
- `recipeId` 只能来自 `availableRecipes`；
- 使用简短、自然的中文。

服务端验证上游 `choices[0].message.content`，剥离可选 Markdown JSON fence，
解析并重新序列化允许字段。无效输出返回清洗后的 `502`。

## 9. 图片请求

现有 `/api/illustrate` 的 RecipePlan、四风格 Prompt、图片校验和 PNG 响应保持
不变。上游配置从兼容变量迁移到无头图片网关变量；请求模型固定为
`HEADLESS_IMAGE_GATEWAY_MODEL`。

浏览器继续只提交：

```json
{
  "style": "xiaohei",
  "recipeText": "中文食谱",
  "page": 1
}
```

## 10. Fixture 兜底

在线请求优先。以下情况自动显示现有本地 Fixture：

- 匿名会话获取失败；
- 网络不可用；
- 超时；
- `429`；
- BFF `5xx`；
- 上游结构无效。

Fixture 回退使用用户友好文案，不显示 Provider、网关、模型或原始错误。
回退不能改变当前 Demo 世界。

## 11. 限制与日志

服务端强制：

- message 最长 800 字；
- JSON body 和 snapshot 有明确字节上限；
- inventory、plannedMeals、missingItems 和 availableRecipes 有数量上限；
- 文本请求超时；
- 输出字符数上限；
- `Cache-Control: no-store`；
- 固定模型路由和 System Prompt。

首版不引入数据库或 KV。可靠限流由 Vercel Firewall 或无头网关执行：

```text
/api/demo/agent       每 IP 每分钟 6 次
/api/demo/recommend   每 IP 每分钟 3 次
/api/illustrate       每 IP 每 2 分钟 1 次
```

如果 Vercel 套餐或权限无法通过 API 配置 Firewall，代码仍完成所有请求边界，
并把 GUI Firewall 配置作为唯一允许的人工交接项。

日志只允许 request ID、route、status、latency 和上游状态分类。不得记录
Prompt、回复、完整 snapshot、Token 或密钥。

## 12. CSP

Vercel Header 保持 `connect-src 'self'`，因为 Vercel Demo 使用同源 API。

Retinbox 的静态 HTML 增加 CSP meta，允许：

```text
connect-src 'self' https://fridge-elf-app.vercel.app
```

其他现有 script、style、font、image 和 permission 限制保持不变。

## 13. 验收

- 两个 `/demo` 均能获得匿名会话。
- 两个 `/demo` 均能调用 Agent 和 AI 推荐。
- 两个 `/demo` 均能生成四风格图片。
- Agent 能结合当前库存、临期、规划和缺货数据回答。
- Agent 响应不触发任何 Reducer 写操作。
- 未知 `recipeId` 不执行导航。
- 网关失败时可靠显示 Fixture。
- 刷新恢复初始 Fixture，业务状态不进入 `localStorage`。
- Bundle 不包含任何 Key 或无头网关地址。
- Retinbox 只包含公开 Vercel BFF origin。
- CORS、CSP、输入限制、输出校验和错误清洗测试通过。
- Vercel 与 Retinbox 线上真实浏览器验收通过。

