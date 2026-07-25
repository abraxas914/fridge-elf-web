import { describe, expect, it, vi } from 'vitest'
import {
  handleAndroidDownloadRequest,
  handleLatestReleaseRequest,
} from './_lib/releases'

const upstreamRelease = {
  tag_name: 'v1.2.3',
  name: 'Fridge Elf v1.2.3',
  published_at: '2026-07-25T08:00:00Z',
  html_url: 'https://github.com/YantingShen-dev/fridge_app/releases/tag/v1.2.3',
  draft: false,
  prerelease: false,
  assets: [
    {
      name: 'fridge-elf-android-v1.2.3.apk',
      browser_download_url:
        'https://github.com/YantingShen-dev/fridge_app/releases/download/v1.2.3/fridge-elf-android-v1.2.3.apk',
      size: 12_582_912,
    },
  ],
}

describe('release endpoints', () => {
  it('returns cached, whitelisted release metadata', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(upstreamRelease))
    const response = await handleLatestReleaseRequest(
      new Request('https://fridgeelf.rth1.xyz/api/releases/latest'),
      {},
      fetcher,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('s-maxage=300')
    expect(await response.json()).toMatchObject({
      tagName: 'v1.2.3',
      apkName: 'fridge-elf-android-v1.2.3.apk',
    })
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.github.com/repos/YantingShen-dev/fridge_app/releases/latest',
      expect.objectContaining({ headers: expect.any(Object) }),
    )
  })

  it('redirects the stable same-domain download path to the release asset', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(upstreamRelease))
    const response = await handleAndroidDownloadRequest(
      new Request('https://fridgeelf.rth1.xyz/api/download/android'),
      {},
      fetcher,
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      upstreamRelease.assets[0].browser_download_url,
    )
  })

  it('reports missing GitHub releases without leaking upstream payloads', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ message: 'Not Found' }, { status: 404 }),
    )
    const response = await handleLatestReleaseRequest(
      new Request('https://fridgeelf.rth1.xyz/api/releases/latest'),
      {},
      fetcher,
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: { code: 'NO_RELEASE', message: '暂无可下载的正式 APK' },
    })
  })

  it('retries the public release API without a restricted token after 404', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ message: 'Not Found' }, { status: 404 }),
      )
      .mockResolvedValueOnce(Response.json(upstreamRelease))

    const response = await handleLatestReleaseRequest(
      new Request('https://fridgeelf.rth1.xyz/api/releases/latest'),
      { GITHUB_RELEASE_TOKEN: 'restricted-token' },
      fetcher,
    )

    expect(response.status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({
      authorization: 'Bearer restricted-token',
    })
    expect(fetcher.mock.calls[1][1]?.headers).not.toHaveProperty(
      'authorization',
    )
  })
})
