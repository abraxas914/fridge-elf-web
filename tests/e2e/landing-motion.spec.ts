import { expect, test } from '@playwright/test'

async function stubMissingRelease(page: import('@playwright/test').Page) {
  await page.route('**/api/releases/latest', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: '暂无正式版本' } }),
    })
  })
}

test('desktop keeps a natural long scroll with proximity section rhythm', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await stubMissingRelease(page)
  await page.goto('/')

  const behavior = await page.locator('.landing-page').evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      scrollSnapType: style.scrollSnapType,
    }
  })

  expect(behavior.scrollHeight).toBeGreaterThan(behavior.clientHeight * 5)
  expect(behavior.scrollSnapType).toContain('y')
  await expect(page.getByRole('navigation', { name: '页面章节' })).toBeVisible()
  expect(await page.getByRole('img').count()).toBeGreaterThanOrEqual(6)
})

test('mobile uses one column without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await stubMissingRelease(page)
  await page.goto('/')

  const geometry = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    pageWidth: document.querySelector('.landing-page')?.scrollWidth ?? 0,
  }))

  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth)
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewportWidth)
  await expect(page.getByRole('navigation', { name: '页面章节' })).toBeHidden()
  await expect(
    page.getByRole('heading', {
      name: '让冰箱里的每一份食材，都有始有终。',
    }),
  ).toBeVisible()
})

test('reduced motion removes snap and looping illustration movement', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await stubMissingRelease(page)
  await page.goto('/')

  const motion = await page.evaluate(() => {
    const landing = document.querySelector('.landing-page')
    const fridge = document.querySelector('.hero-fridge-float')
    if (!landing || !fridge) throw new Error('landing illustration unavailable')
    return {
      scrollSnapType: getComputedStyle(landing).scrollSnapType,
      animationName: getComputedStyle(fridge).animationName,
    }
  })

  expect(motion.scrollSnapType).toBe('none')
  expect(motion.animationName).toBe('none')
})

test('lifecycle nodes remain distributed around the full loop after reveal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await stubMissingRelease(page)
  await page.goto('/')
  await page.locator('#lifecycle').scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)

  const nodes = await page.locator('.lifecycle-node').evaluateAll((elements) =>
    elements.map((element) => {
      const bounds = element.getBoundingClientRect()
      return { x: bounds.x, y: bounds.y }
    }),
  )
  const xValues = nodes.map(({ x }) => x)
  const yValues = nodes.map(({ y }) => y)

  expect(Math.max(...xValues) - Math.min(...xValues)).toBeGreaterThan(250)
  expect(Math.max(...yValues) - Math.min(...yValues)).toBeGreaterThan(160)
})
