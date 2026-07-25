import { spawnSync } from 'node:child_process'
import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import {
  captures,
  resolveBaseUrl,
} from './readme-capture-config.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, '..')
const outputDirectory = path.join(projectDirectory, 'docs', 'readme')
const temporaryDirectory = path.join(
  outputDirectory,
  '.capture-tmp',
)
const baseUrl = resolveBaseUrl(process.env.README_CAPTURE_BASE_URL)
const maximumBytes = 500 * 1024

const releaseFixture = {
  tagName: 'v1.0.0',
  title: 'Fridge Elf v1.0.0',
  publishedAt: '2026-07-25T12:00:00Z',
  releaseUrl:
    'https://github.com/YantingShen-dev/fridge_app/releases/tag/v1.0.0',
  apkName: 'smart-tag-android-v1.0.0.apk',
  apkUrl:
    'https://github.com/YantingShen-dev/fridge_app/releases/download/v1.0.0/smart-tag-android-v1.0.0.apk',
  apkSize: 24 * 1024 * 1024,
  checksumUrl: null,
}

function runMagick(arguments_, purpose) {
  const result = spawnSync('magick', arguments_, {
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim()
    throw new Error(`${purpose}失败：${detail || 'ImageMagick 不可用'}`)
  }
  return result.stdout.trim()
}

async function verifyOutput(capture, outputPath) {
  const dimensions = runMagick(
    ['identify', '-format', '%wx%h', outputPath],
    `检查 ${capture.name} 尺寸`,
  )
  const expected = `${capture.width}x${capture.height}`
  if (dimensions !== expected) {
    throw new Error(
      `${capture.name} 尺寸为 ${dimensions}，预期 ${expected}`,
    )
  }

  const metadata = await stat(outputPath)
  if (metadata.size > maximumBytes) {
    throw new Error(
      `${capture.name} 为 ${Math.ceil(metadata.size / 1024)} KB，超过 500 KB`,
    )
  }

  return Math.ceil(metadata.size / 1024)
}

async function capturePage(page, capture) {
  await page.setViewportSize({
    width: capture.width,
    height: capture.height,
  })
  await page.goto(`${baseUrl}${capture.route}`, {
    waitUntil: 'networkidle',
  })
  await page.locator(capture.waitFor).waitFor({ state: 'visible' })
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        caret-color: transparent !important;
        transition: none !important;
      }
    `,
  })

  if (capture.element) {
    const target = page.locator(capture.element)
    await target.scrollIntoViewIfNeeded()
    await page.evaluate((selector) => {
      const element = document.querySelector(selector)
      if (!element) throw new Error(`找不到截图锚点：${selector}`)
      window.scrollTo({
        top: element.getBoundingClientRect().top + window.scrollY,
        behavior: 'instant',
      })
    }, capture.element)
  }

  const pngPath = path.join(
    temporaryDirectory,
    `${capture.name}.png`,
  )
  const webpPath = path.join(
    outputDirectory,
    `${capture.name}.webp`,
  )

  await page.screenshot({
    path: pngPath,
    clip: capture.clip,
  })
  runMagick(
    [pngPath, '-strip', '-quality', '82', webpPath],
    `转换 ${capture.name}`,
  )
  const size = await verifyOutput(capture, webpPath)
  process.stdout.write(
    `✓ ${capture.name}.webp ${capture.width}×${capture.height} ${size} KB\n`,
  )
}

runMagick(['-version'], '检查 ImageMagick')
await mkdir(temporaryDirectory, { recursive: true })

const browser = await chromium.launch({
  channel: 'chromium',
  headless: true,
})

try {
  const context = await browser.newContext({
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.route('**/api/releases/latest', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(releaseFixture),
    }),
  )

  for (const capture of captures) {
    await capturePage(page, capture)
  }
} finally {
  await browser.close()
}
