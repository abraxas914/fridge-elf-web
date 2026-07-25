import { expect, test } from '@playwright/test'

test('landing page links the latest APK and opens the demo without leaving the domain', async ({
  page,
}) => {
  await page.route('**/api/releases/latest', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        tagName: 'v1.2.3',
        title: 'Smart Tag v1.2.3',
        publishedAt: '2026-07-25T08:00:00Z',
        releaseUrl:
          'https://github.com/YantingShen-dev/fridge_app/releases/tag/v1.2.3',
        apkName: 'smart-tag-android-v1.2.3.apk',
        apkUrl:
          'https://github.com/YantingShen-dev/fridge_app/releases/download/v1.2.3/smart-tag-android-v1.2.3.apk',
        apkSize: 12_582_912,
        checksumUrl: null,
      }),
    })
  })

  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: '把冰箱里的食材，变成今天的一餐' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'v1.2.3' })).toBeVisible()
  await expect(page.getByRole('link', { name: '下载 Android APK' })).toHaveAttribute(
    'href',
    '/api/download/android',
  )

  await page.getByRole('link', { name: '打开在线 Demo' }).click()
  await expect(page).toHaveURL(/\/demo$/)
  await expect(page.getByRole('heading', { name: '冰箱生活助手' })).toBeVisible()
})
