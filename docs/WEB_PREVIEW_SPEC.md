# Web Preview 菜谱插画规范

## 1. 定位

这是独立 Vercel 部署仓库，不属于 Android APK，也不替代 Android 的 BYOK 实现。用户从带签名的二维码链接进入，前端不接触 Image2 API Key。

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

## 4. HTTP 合约

`POST /api/illustrate`

Headers:

- `Content-Type: application/json`
- `X-Demo-Token: <expires>.<hmac-sha256>`

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

服务端固定调用：

```json
{
  "model": "gpt-image-2",
  "size": "1024x1536",
  "quality": "auto",
  "output_format": "png",
  "n": 1
}
```

空响应、HTTP 429 或 5xx 最多重试两次。输出必须有 PNG 签名且不超过 4.2 MB。

## 5. 安全与运维

- `IMAGE_API_KEY` 和 `DEMO_TOKEN_SECRET` 只能存在于 Vercel Production Environment Variables。
- 禁止使用 `VITE_` 前缀保存任何 secret。
- 二维码 token 有过期时间，进入后写入 `sessionStorage` 并从地址栏删除；刷新仍可使用，关闭会话后不长期保留。
- CSP 只允许同源连接；禁止 iframe、摄像头、麦克风和地理位置。
- Vercel WAF 对 `/api/illustrate` 增加 IP 频率限制；建议 10 分钟 3 次。
- 监控 401、422、429、502 和函数时长，不记录完整食谱或任何凭证。
