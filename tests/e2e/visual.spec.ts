import { expect, test, type Page } from '@playwright/test'
import { enterApp, prepareApp, selectTab } from './helpers/appDriver'

async function shot(page: Page, id: string) {
  await expect.soft(page).toHaveScreenshot(`${id}.png`, {
    fullPage: false,
  })
}

test('the 16 named visual states stay locked', async ({ page }) => {
  await prepareApp(page)
  await shot(page, 'kitchen-default')
  await enterApp(page)
  await shot(page, 'fridge-default')
  await page.getByRole('button', { name: '番茄，4个' }).click()
  await shot(page, 'fridge-urgent-modal')
  await page.getByRole('button', { name: '关闭' }).click()

  await selectTab(page, '购物')
  await shot(page, 'shop-default')
  await page.getByRole('button', { name: '完成 牛奶' }).click()
  await shot(page, 'shop-checked')

  await selectTab(page, '食谱')
  await shot(page, 'recipe-default')
  await page.getByRole('button', { name: /个人收藏食谱/ }).click()
  await page.getByRole('button', { name: '查看完整食谱' }).click()
  await expect(page.getByText('用时')).toBeVisible()
  await shot(page, 'recipe-detail')
  await page.getByRole('button', { name: '关闭' }).click()
  await page.getByRole('button', { name: /周规划/ }).click()
  await shot(page, 'recipe-planner')
  await page.getByRole('button', { name: '关闭' }).click()

  await selectTab(page, '显示屏')
  await shot(page, 'display-home')
  await page.getByRole('button', { name: '便签' }).click()
  await shot(page, 'display-note')
  await page.getByRole('button', { name: /早点回家/ }).click()
  await page.getByRole('button', { name: '发送' }).click()
  await expect(
    page.locator('.display-screen').getByText('早点回家'),
  ).toBeVisible()
  await shot(page, 'display-message')
  await page.getByRole('button', { name: '三餐' }).click()
  await shot(page, 'display-meals')
  await page.getByRole('button', { name: '日历' }).click()
  await shot(page, 'display-calendar')

  await selectTab(page, '我的')
  await expect(page.getByRole('status')).not.toHaveClass(/show/, {
    timeout: 2_500,
  })
  await shot(page, 'profile-solo')
  await page.getByRole('button', { name: /家庭/ }).click()
  await expect(page.getByRole('status')).not.toHaveClass(/show/, {
    timeout: 2_500,
  })
  await shot(page, 'profile-family')
  await page.getByRole('button', { name: /合租/ }).click()
  await expect(page.getByRole('status')).not.toHaveClass(/show/, {
    timeout: 2_500,
  })
  await shot(page, 'profile-roommate')
})
