import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('shows one-domain entry points for the APK and browser demo', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        tagName: 'v1.2.3',
        title: 'Smart Tag v1.2.3',
        publishedAt: '2026-07-25T08:00:00Z',
        releaseUrl:
          'https://github.com/YantingShen-dev/fridge_app/releases/tag/v1.2.3',
        apkName: 'smart-tag-android-v1.2.3.apk',
        apkUrl:
          'https://github.com/YantingShen-dev/fridge_app/releases/download/v1.2.3/smart-tag-android-v1.2.3.apk',
        apkSize: 12_582_912,
        checksumUrl:
          'https://github.com/YantingShen-dev/fridge_app/releases/download/v1.2.3/smart-tag-android-v1.2.3.apk.sha256',
      }),
    )

    render(<LandingPage fetcher={fetcher} />)

    expect(
      screen.getByRole('heading', { name: '把冰箱里的食材，变成今天的一餐' }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: '打开在线 Demo' })).toHaveAttribute(
      'href',
      '/demo',
    )
    await waitFor(() =>
      expect(screen.getByText('v1.2.3')).toBeVisible(),
    )
    expect(
      screen.getByRole('link', { name: '下载 Android APK' }),
    ).toHaveAttribute('href', '/api/download/android')
  })

  it('keeps the demo available when release metadata cannot load', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ error: { message: '暂无正式版本' } }, { status: 404 }),
    )

    render(<LandingPage fetcher={fetcher} />)

    expect(await screen.findByText('APK 正在准备中')).toBeVisible()
    expect(screen.getByRole('link', { name: '打开在线 Demo' })).toBeVisible()
    expect(
      screen.queryByRole('link', { name: '下载 Android APK' }),
    ).not.toBeInTheDocument()
  })
})
