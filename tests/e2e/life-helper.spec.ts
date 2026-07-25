import { expect, test } from '@playwright/test'
import {
  enterApp,
  expectNoOverflow,
  prepareApp,
  selectTab,
} from './helpers/appDriver'

test('complete five-tab prototype journey remains browser-only and usable', async ({
  page,
}) => {
  const pageErrors: Error[] = []
  const externalRequests: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error))
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
      externalRequests.push(request.url())
    }
  })

  await prepareApp(page)
  await page.getByRole('button', { name: '点击冰箱进入' }).click()
  await expect(page.getByRole('tab', { name: '冰箱' })).toBeVisible()
  await page.getByRole('button', { name: '番茄，4个' }).click()
  await expect(page.getByRole('dialog')).toContainText('番茄 · Tomato')
  await page.getByRole('button', { name: '关闭' }).click()

  await selectTab(page, '购物')
  await page.getByRole('button', { name: /牛奶.*2L/ }).click()
  await expect(page.getByRole('button', { name: /牛奶.*2L/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await selectTab(page, '食谱')
  await page.getByRole('button', { name: /番茄鸡蛋轻食碗/ }).click()
  await expect(page.getByRole('dialog')).toContainText('用时')
  await page.getByRole('button', { name: '关闭' }).click()
  await page.getByRole('button', { name: /周规划/ }).click()
  await page.getByRole('button', { name: /周一/ }).click()
  await page.getByRole('button', { name: /三文鱼谷物碗/ }).last().click()
  await page.getByRole('button', { name: /周一/ }).click()
  await page.getByRole('button', { name: /香蕉燕麦松饼/ }).last().click()
  await page.getByRole('button', { name: '关闭' }).click()
  await selectTab(page, '购物')
  await expect(page.getByText('• 燕麦')).toBeVisible()

  await selectTab(page, '显示屏')
  await page.getByTestId('device-screen').click()
  await expect(page.getByTestId('device-screen')).toHaveClass(/awake/)
  await page.getByRole('button', { name: /早点回家/ }).click()
  await page.getByRole('button', { name: '发送 ▶' }).click()
  await expect(page.getByTestId('display-note')).toContainText('早点回家')
  await page.getByRole('button', { name: /三餐/ }).click()
  await expect(page.getByTestId('display-widget-meals')).toBeVisible()

  await selectTab(page, '我的')
  await page.getByRole('button', { name: /家庭/ }).click()
  await expect(page.getByTestId('family-panel')).toBeVisible()
  await page.getByRole('button', { name: /合租/ }).click()
  await expect(page.getByTestId('roomie-panel')).toBeVisible()
  await selectTab(page, '冰箱')

  await expect(page.getByText('BROWSER MOCK')).toBeVisible()
  await expectNoOverflow(page)
  expect(pageErrors).toEqual([])
  expect(externalRequests).toEqual([])
})

test('360, 412, and 480 widths never overflow horizontally', async ({ page }) => {
  for (const width of [360, 412, 480]) {
    await page.setViewportSize({ width, height: 915 })
    await prepareApp(page)
    await enterApp(page)
    for (const tab of ['购物', '食谱', '冰箱', '显示屏', '我的']) {
      await selectTab(page, tab)
      await expectNoOverflow(page)
    }
  }
})
