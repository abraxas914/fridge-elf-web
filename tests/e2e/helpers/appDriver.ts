import { expect, type Page } from '@playwright/test'

export async function prepareApp(page: Page, path = '/demo') {
  await page.addInitScript(() => {
    localStorage.removeItem('life-helper-v2-browser-inventory')
    const FixedDate = class extends Date {
      constructor(...args: ConstructorParameters<typeof Date>) {
        super(...(args.length ? args : ['2026-07-24T12:00:00+08:00']))
      }
      static now() {
        return new Date('2026-07-24T12:00:00+08:00').valueOf()
      }
    }
    Object.defineProperty(window, 'Date', { value: FixedDate })
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(path)
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important}',
  })
  if (path.startsWith('/demo')) {
    await expect(page.getByTestId('kitchen-scene')).toBeVisible()
  }
}

export async function enterApp(page: Page) {
  await page.getByRole('button', { name: '跳过' }).click()
  await expect(page.getByRole('tab', { name: '冰箱' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
}

export async function selectTab(page: Page, name: string) {
  await page.getByRole('tab', { name }).click()
  await expect(page.getByRole('tab', { name })).toHaveAttribute(
    'aria-selected',
    'true',
  )
}

export async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
}
