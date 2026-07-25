import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('shows one-domain entry points for the APK and browser demo', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        tagName: 'v1.2.3',
        title: 'Fridge Elf v1.2.3',
        publishedAt: '2026-07-25T08:00:00Z',
        releaseUrl:
          'https://github.com/YantingShen-dev/fridge_app/releases/tag/v1.2.3',
        apkName: 'fridge-elf-android-v1.2.3.apk',
        apkUrl:
          'https://github.com/YantingShen-dev/fridge_app/releases/download/v1.2.3/fridge-elf-android-v1.2.3.apk',
        apkSize: 12_582_912,
        checksumUrl:
          'https://github.com/YantingShen-dev/fridge_app/releases/download/v1.2.3/fridge-elf-android-v1.2.3.apk.sha256',
      }),
    )

    render(<LandingPage fetcher={fetcher} />)

    expect(
      screen.getByRole('heading', {
        name: '让冰箱里的每一份食材，都有始有终。',
      }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: '打开在线 Demo' })).toHaveAttribute(
      'href',
      '/demo',
    )
    await waitFor(() =>
      expect(screen.getByRole('heading', {
        name: 'Fridge Elf v1.2.3',
      })).toBeVisible(),
    )
    expect(
      screen.getByRole('link', { name: '下载 Fridge Elf v1.2.3' }),
    ).toHaveAttribute('href', '/api/download/android')
    expect(screen.getByText('SHA-256 可校验')).toBeVisible()
  })

  it('keeps the demo available when release metadata cannot load', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ error: { message: '暂无正式版本' } }, { status: 404 }),
    )

    render(<LandingPage fetcher={fetcher} />)

    expect(
      await screen.findByText('正式版已完成 · 公开下载配置中'),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Fridge Elf v1.0.0' }),
    ).toBeVisible()
    expect(
      screen.getByText(/仓库公开后，这里会自动开放下载/),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: '打开在线 Demo' })).toBeVisible()
    expect(
      screen.queryByRole('link', { name: /下载 Fridge Elf/ }),
    ).not.toBeInTheDocument()
  })

  it('tells the full food lifecycle story without exposing implementation details', () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ error: { message: '暂无正式版本' } }, { status: 404 }),
    )

    render(<LandingPage fetcher={fetcher} />)

    expect(
      screen.getByRole('heading', {
        name: '让冰箱里的每一份食材，都有始有终。',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', {
        name: '从买回来，到用掉，再回到下一次采购。',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', {
        name: '冰箱旁和手机上，始终是同一份库存。',
      }),
    ).toBeVisible()
    const iotSection = document.querySelector('#iot')
    expect(iotSection).not.toBeNull()
    expect(
      within(iotSection as HTMLElement).getByRole('img', {
        name: '同时运行 Fridge Elf 的手机端与冰箱硬件终端原型',
      }),
    ).toBeVisible()
    expect(screen.getByText('家庭共享库存')).toBeVisible()
    expect(
      screen.getByRole('heading', { name: '今天先从冰箱开始。' }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', {
        name: '家里的东西，也应该留下可以继续使用的信息。',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', {
        name: '把做饭这件事，画得更简单。',
      }),
    ).toBeVisible()
    expect(screen.getByText('从食材到上桌，一眼看懂。')).toBeVisible()
    expect(screen.getByRole('link', { name: '开始制作' })).toHaveAttribute(
      'href',
      '/demo',
    )
    expect(
      screen.queryByText(/T5AI|Android、Wi-Fi|MQTT|DashScope/),
    ).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(
      /Smart Tag|风格|Skill|小黑/,
    )
  })

  it('links the long-form story through product-level section navigation', () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ error: { message: '暂无正式版本' } }, { status: 404 }),
    )

    render(<LandingPage fetcher={fetcher} />)

    const destinations = [
      ['食材的一生', '#lifecycle'],
      ['家庭 IoT', '#iot'],
      ['多模态', '#multimodal'],
      ['为什么', '#why'],
      ['体验', '#experience'],
    ]

    for (const [name, href] of destinations) {
      expect(screen.getAllByRole('link', { name })).not.toHaveLength(0)
      expect(screen.getAllByRole('link', { name })[0]).toHaveAttribute(
        'href',
        href,
      )
    }
  })
})
