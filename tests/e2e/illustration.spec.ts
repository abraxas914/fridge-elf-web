import { expect, test } from '@playwright/test'
import { enterApp, prepareApp, selectTab } from './helpers/appDriver'

test('signed demo session generates an illustration without exposing a key', async ({
  page,
}) => {
  const requests: Array<Record<string, unknown>> = []
  await page.route('**/api/illustrate', async (route) => {
    requests.push(route.request().postDataJSON())
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      headers: {
        'x-recipe-page': '1',
        'x-recipe-pages': '1',
      },
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB', 'base64'),
    })
  })

  await prepareApp(page, '/demo?demo=e2e-signed-token')
  await expect(page).not.toHaveURL(/demo=/)
  await enterApp(page)
  await selectTab(page, '食谱')
  await page.getByRole('button', { name: /菜谱插画/ }).click()
  await expect(page.getByRole('dialog')).toContainText('选择插画风格')
  await page.getByRole('button', { name: /水彩厨房/ }).click()
  await page.getByRole('button', { name: /生成插画/ }).click()

  await expect(page.getByRole('img', { name: /番茄炒蛋.*第 1 页/ })).toBeVisible()
  expect(requests).toHaveLength(1)
  expect(requests[0]).toMatchObject({
    style: 'watercolor',
    page: 1,
  })
  expect(requests[0]).not.toHaveProperty('prompt')
  expect(JSON.stringify(requests[0])).not.toContain('sk-')
})
