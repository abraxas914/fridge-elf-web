import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { inlineViteHtml } from './retinbox-html.mjs'

const distDir = resolve('dist')
const entry = resolve(distDir, 'index.html')
const demoDir = resolve(distDir, 'demo')

const html = await readFile(entry, 'utf8')
const inlinedHtml = await inlineViteHtml(html, (assetPath) =>
  readFile(
    resolve(distDir, assetPath.split(/[?#]/, 1)[0].replace(/^\/+/, '')),
    'utf8',
  ),
)

await writeFile(entry, inlinedHtml)
await mkdir(demoDir, { recursive: true })
await Promise.all([
  copyFile(entry, resolve(demoDir, 'index.html')),
  copyFile(entry, resolve(distDir, '404.html')),
])

console.info('Prepared self-contained Retinbox SPA routes: /demo and /404.html')
