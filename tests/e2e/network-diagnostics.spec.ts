import { expect, test } from '@playwright/test'

test('network diagnostics stay mobile-safe and correlate a session probe', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const requestIds: string[] = []
  await page.route('**/api/demo/session', async (route) => {
    const requestId =
      route.request().headers()['x-request-id'] ?? ''
    requestIds.push(requestId)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'x-request-id': requestId },
      body: JSON.stringify({
        token: 'e2e-session-token',
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
    })
  })

  await page.goto('/demo?debug=network')
  await page.getByRole('button', { name: '网络诊断' }).click()
  const dialog = page.getByRole('dialog', { name: '网络诊断' })
  await expect(dialog).toBeVisible()

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }
  })
  expect(geometry.left).toBeGreaterThanOrEqual(0)
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth)
  expect(geometry.top).toBeGreaterThanOrEqual(0)
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight)

  await page.getByRole('button', { name: '运行自检' }).click()
  await expect(dialog.getByText('SESSION 200')).toBeVisible()
  await expect(dialog.getByText('SESSION · SUCCESS')).toBeVisible()
  expect(requestIds).toHaveLength(1)
  expect(requestIds[0]).toMatch(/^[A-Za-z0-9_-]{8,80}$/)
})

test('normal demo does not render diagnostics controls', async ({
  page,
}) => {
  await page.goto('/demo')
  await expect(
    page.getByRole('button', { name: '网络诊断' }),
  ).toHaveCount(0)
})
