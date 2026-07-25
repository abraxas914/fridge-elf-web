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

test('desktop scroll promotes all four recipe images in the approved order', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await stubMissingRelease(page)
  await page.goto('/')

  const showcase = page.locator('.recipe-showcase')
  await showcase.scrollIntoViewIfNeeded()

  for (const [progress, activeIndex] of [
    [0.1, '2'],
    [0.35, '1'],
    [0.6, '3'],
    [0.9, '4'],
  ] as const) {
    await showcase.evaluate((section, nextProgress) => {
      const landing = section.closest('.landing-page')
      if (!(landing instanceof HTMLElement)) {
        throw new Error('landing scroll root unavailable')
      }
      const scrollRange = section.clientHeight - landing.clientHeight
      landing.scrollTo({
        top: (section as HTMLElement).offsetTop + scrollRange * nextProgress,
        behavior: 'instant',
      })
    }, progress)
    await page.waitForTimeout(120)
    await expect(showcase).toHaveAttribute('data-active-index', activeIndex)
  }
})

test('reduced motion keeps the second recipe image in the main position', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await stubMissingRelease(page)
  await page.goto('/')

  const showcase = page.locator('.recipe-showcase')
  await showcase.evaluate((section) => {
    const landing = section.closest('.landing-page')
    if (!(landing instanceof HTMLElement)) {
      throw new Error('landing scroll root unavailable')
    }
    landing.scrollTo({
      top: (section as HTMLElement).offsetTop + section.clientHeight,
      behavior: 'instant',
    })
  })

  await expect(showcase).toHaveAttribute('data-active-index', '2')
})

test('mobile recipe gallery peeks, scrolls natively, and never widens the page', async ({
  page,
}) => {
  await stubMissingRelease(page)

  for (const width of [360, 412, 480]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')

    const geometry = await page.locator('.recipe-showcase-gallery').evaluate(
      (gallery) => ({
        overflowX: getComputedStyle(gallery).overflowX,
        galleryWidth: gallery.clientWidth,
        galleryScrollWidth: gallery.scrollWidth,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        objectFits: Array.from(gallery.querySelectorAll('img')).map(
          (image) => getComputedStyle(image).objectFit,
        ),
      }),
    )

    expect(geometry.overflowX).toBe('auto')
    expect(geometry.galleryScrollWidth).toBeGreaterThan(geometry.galleryWidth)
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.objectFits).toEqual([
      'contain',
      'contain',
      'contain',
      'contain',
    ])
  }
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
