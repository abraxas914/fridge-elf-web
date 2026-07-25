# Web Preview 无状态 AI 与菜谱插画规范

## 1. 定位

这是独立 Web Demo 部署仓库，不属于 Android APK，也不替代 Android 的 BYOK 实现。Vercel 与 Retinbox 两个 `/demo` 地址共享 Vercel BFF；前端不接触文本或 Image2 API Key。

## 2. Skill 规范来源

四个运行时与下列本地 Skill 一一对应：

- 小黑手绘：`/Users/ethan/workspace/projects/recipe-xiaohei-illustrations/recipe-xiaohei-illustrations`
- 水彩厨房：`/Users/ethan/workspace/projects/recipe-watercolor-kitchen-illustrations/recipe-watercolor-kitchen-illustrations`
- 亚麻手帖：`/Users/ethan/workspace/projects/recipe-linen-zine-illustrations/recipe-linen-zine-illustrations`
- 像素涂鸦：`/Users/ethan/workspace/projects/recipe-pixel-doodle-illustrations/recipe-pixel-doodle-illustrations`

四种风格共享同一个 `RecipePlan` 信息合约，只替换角色、配色、线条、步骤格和箭头的风格 DNA。

## 3. RecipePlan

- 输入必须包含菜名、食材和编号步骤，最长 4000 字。
- 标题最多 12 个中文字符。
- 食材最多显示 8 项；超出项合并但不得丢失名称与用量语义。
- 步骤保持原顺序，不补造用量、时间、温度、火候、熟成或建议。
- 每页最多 6 步，使用最少页数；9 步必须为 6+3。
- 每页固定 1200×1440、5:6、10% 安全边距、两列三行蛇形阅读。
- 每步角色/温手必须实际控制食材或器具，不能站岗、指路或举牌。
- 图片中的中文只允许标题、页码、首页食材和短步骤标签。

## 4. 匿名会话与只读 Agent

浏览器先调用 `POST /api/demo/session` 获取两小时有效的 HMAC 匿名会话，并仅
保存到 `sessionStorage`。Retinbox 使用
`https://fridge-elf-app.vercel.app` 作为 BFF，所有请求通过
`Authorization: Bearer <session>` 鉴权。

只读端点：

- `POST /api/demo/agent`
- `POST /api/demo/recommend`

两者只接收裁剪后的当前 mock 世界快照。服务端固定 System Prompt、限制正文长度、
验证上游 JSON，并只返回 `answer`、`suggestions` 和 `notices`。任何 action、tool
或未知字段均被丢弃，模型不能直接修改库存、采购、三餐、便签、Profile 或设备状态。

网络错误、超时、限流、上游 5xx 或无效输出时，前端使用内置 Fixture 继续演示。
不保存对话历史，刷新或关闭页面即结束本次世界。

## 5. 图片 HTTP 合约

`POST /api/illustrate`

Headers:

- `Content-Type: application/json`
- `Authorization: Bearer <anonymous-session>`

Body 只允许：

```json
{
  "style": "xiaohei | watercolor | linen-zine | pixel-doodle",
  "recipeText": "中文食谱",
  "page": 1
}
```

成功返回 `image/png`，并包含：

- `X-Recipe-Page`
- `X-Recipe-Pages`
- `Cache-Control: no-store`

服务端调用由 `HEADLESS_IMAGE_GATEWAY_*` 配置的 OpenAI-compatible 图片端点：

```json
{
  "model": "<server-configured>",
  "size": "1024x1536",
  "quality": "auto",
  "output_format": "png",
  "n": 1
}
```

空响应、HTTP 429 或 5xx 最多重试两次。输出必须有 PNG 签名且不超过 4.2 MB。

## 6. 安全与运维

- `DEMO_SESSION_SECRET`、`HEADLESS_GATEWAY_API_KEY` 和 `HEADLESS_IMAGE_GATEWAY_API_KEY` 只能存在于 Vercel Environment Variables 或本地未提交的 `.env.local`。
- 禁止使用 `VITE_` 前缀保存任何 secret。
- Retinbox CSP 只额外允许连接公开的 Vercel BFF；供应商地址和密钥不得进入静态构建。
- 禁止 iframe、摄像头、麦克风和地理位置。
- Vercel Firewall 分别限制 Agent、推荐与图片路由的每 IP 请求频率。
- 监控 401、422、429、502 和函数时长，不记录完整食谱或任何凭证。
- 当前文本上游为 HTTP；比赛阶段接受 Vercel Function 到上游没有 TLS 的临时风险。
