# Fridge Elf · Smart Tag Web SPA

单域名发布入口与在线演示：

- `/`：Landing Page、最新 Android APK 与版本信息。
- `/demo`：完整 Smart Tag 浏览器 Demo。
- `/api/releases/latest`：读取 `YantingShen-dev/fridge_app` 最新稳定 Release。
- `/api/download/android`：跳转到与 Release Tag 匹配的 APK。
- `/api/illustrate`：调用 Image2 生成四种 1200×1440 菜谱插画。

正式 Release 必须使用 `vX.Y.Z` Tag，并包含同名资产：

```text
smart-tag-android-vX.Y.Z.apk
smart-tag-android-vX.Y.Z.apk.sha256
```

发布满足该约定后，Landing Page 会在最多 5 分钟内自动显示新版本和下载按钮。

## 本地验证

```bash
npm ci
npm test
npm run build
npm run e2e
```

本地真实 API 联调需要在未提交的 `.env.local` 中配置：

```dotenv
IMAGE_API_ENDPOINT=https://api.iotwq.top/v1/images/generations
IMAGE_API_KEY=...
DEMO_TOKEN_SECRET=...
```

密钥只允许进入本地 `.env.local` 或 Vercel Environment Variables，不得写进源码、前端变量或 `VITE_*`。

## Vercel 环境变量

- `IMAGE_API_ENDPOINT`：Image2 OpenAI-compatible endpoint。
- `IMAGE_API_KEY`：Image2 密钥，应用运行时只在 Vercel Function 内读取。
- `DEMO_TOKEN_SECRET`：至少 16 个随机字符，用于签发带过期时间的扫码链接。
- `GITHUB_RELEASE_TOKEN`：可选。主仓库为私有仓库时必须配置，仅需读取 Release 的权限。

环境变量配置并完成 Production 部署后，用同一 secret 生成演示链接：

```bash
DEMO_TOKEN_SECRET='...' npm run demo-link -- https://your-project.vercel.app 30
```

## 关键边界

- 浏览器只能提交 `{ style, recipeText, page }`，不能提交 raw prompt。
- 服务端重新编译 `RecipePlan`，逐页生成，每页最多 6 步。
- 固定模型 `gpt-image-2`，固定 PNG，最多两次重试。
- API 返回二进制 `image/png`，避免 base64 JSON 超过 Vercel 响应限制。
- 生成结果不写入持久存储；刷新页面后需要重新生成。

完整合约见 [docs/WEB_PREVIEW_SPEC.md](docs/WEB_PREVIEW_SPEC.md)。
