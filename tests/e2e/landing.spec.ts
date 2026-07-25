import { expect, test } from '@playwright/test'
import { prepareApp } from './helpers/appDriver'

test('landing page links the latest APK and opens the demo without leaving the domain', async ({
  page,
}) => {
  await page.route('**/api/releases/latest', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        tagName: 'v1.2.3',
        title: 'Fridge Elf v1.2.3',
        publishedAt: '2026-07-25T08:00:00Z',
        releaseUrl:
          'https://github.com/YantingShen-dev/fridge_app/releases/tag/v1.2.3',
        apkName: 'fridge-elf-android-v1.2.3.apk',
        apkUrl:
          'https://github.com/YantingShen-dev/fridge_app/releases/download/v1.2.3/fridge-elf-android-v1.2.3.apk',
        apkSize: 12_582_912,
        checksumUrl: null,
      }),
    })
  })

  await page.goto('/')
  await expect(
    page.getByRole('heading', {
      name: '让冰箱里的每一份食材，都有始有终。',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Fridge Elf v1.2.3' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: '下载 Fridge Elf v1.2.3' }),
  ).toHaveAttribute('href', '/api/download/android')

  await page.getByRole('link', { name: '打开在线 Demo' }).click()
  await expect(page).toHaveURL(/\/demo$/)
  await expect(page.getByRole('heading', { name: '冰箱生活助手' })).toBeVisible()
})

test('desktop navigation reaches the product-level IoT story', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route('**/api/releases/latest', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: '暂无正式版本' } }),
    })
  })

  await page.goto('/')
  await page
    .getByRole('navigation', { name: '产品介绍章节' })
    .getByRole('link', { name: '家庭 IoT' })
    .click()

  await expect(page.locator('#iot')).toBeInViewport()
  await expect(page.getByText('家庭共享库存')).toBeVisible()
  await expect(page.getByText(/T5AI|MQTT|DashScope/)).toHaveCount(0)
})

test('desktop demo stage stays centered in the browser viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepareApp(page)

  const stage = page.locator('#stage')
  const bounds = await stage.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      center: rect.left + rect.width / 2,
      viewportCenter: window.innerWidth / 2,
      width: rect.width,
    }
  })

  expect(bounds.width).toBe(480)
  expect(Math.abs(bounds.center - bounds.viewportCenter)).toBeLessThan(1)
})
