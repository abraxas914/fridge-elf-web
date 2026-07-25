import { createHmac } from 'node:crypto'

const [baseUrl, daysInput = '30'] = process.argv.slice(2)
const secret = process.env.DEMO_TOKEN_SECRET
const days = Number(daysInput)

if (!baseUrl || !URL.canParse(baseUrl)) {
  throw new Error('Usage: npm run demo-link -- https://your-project.vercel.app [days]')
}
if (!secret || secret.length < 16) {
  throw new Error('DEMO_TOKEN_SECRET must be set and at least 16 characters')
}
if (!Number.isFinite(days) || days <= 0 || days > 365) {
  throw new Error('days must be between 1 and 365')
}

const expires = String(Math.floor((Date.now() + days * 86_400_000) / 1_000))
const signature = createHmac('sha256', secret)
  .update(expires)
  .digest('base64url')
const url = new URL(baseUrl)
url.searchParams.set('demo', `${expires}.${signature}`)

process.stdout.write(`${url.toString()}\n`)
