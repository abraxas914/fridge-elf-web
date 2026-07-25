import assert from 'node:assert/strict'
import test from 'node:test'
import { inlineViteHtml } from './retinbox-html.mjs'
import { readFile } from 'node:fs/promises'

test('inlines Vite JavaScript and CSS while removing module preloads', async () => {
  const html = `<!doctype html>
<html>
  <head>
    <link rel="modulepreload" crossorigin href="/assets/App.js">
    <link rel="stylesheet" crossorigin href="/assets/index.css">
    <script type="module" crossorigin src="/assets/index.js"></script>
  </head>
  <body><div id="root"></div></body>
</html>`
  const assets = new Map([
    ['/assets/index.css', 'body { color: #222; }'],
    ['/assets/index.js', 'document.body.dataset.ready = "yes";'],
  ])

  const result = await inlineViteHtml(html, async (path) => assets.get(path))

  assert.doesNotMatch(result, /modulepreload/)
  assert.doesNotMatch(result, /src="\/assets\/index\.js"/)
  assert.doesNotMatch(result, /href="\/assets\/index\.css"/)
  assert.match(result, /<style>body \{ color: #222; \}<\/style>/)
  assert.match(
    result,
    /<script type="module">document\.body\.dataset\.ready = "yes";<\/script>/,
  )
})

test('allows only the shared Vercel BFF as an external connection', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  const csp = html.match(
    /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/,
  )?.[1]

  assert.ok(csp)
  assert.match(
    csp,
    /connect-src 'self' https:\/\/fridge-elf-app\.vercel\.app/,
  )
  assert.doesNotMatch(csp, /113\.45\.39\.247|api\.iotwq\.top/)
})
