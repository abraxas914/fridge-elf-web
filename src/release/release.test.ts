import { describe, expect, it } from 'vitest'
import { parseLatestRelease } from './release'

describe('parseLatestRelease', () => {
  it('maps a semantic GitHub release to the Android APK contract', () => {
    expect(
      parseLatestRelease({
        tag_name: 'v1.2.3',
        name: 'Smart Tag v1.2.3',
        published_at: '2026-07-25T08:00:00Z',
        html_url: 'https://github.com/YantingShen-dev/fridge_app/releases/tag/v1.2.3',
        draft: false,
        prerelease: false,
        assets: [
          {
            name: 'smart-tag-android-v1.2.3.apk',
            browser_download_url:
              'https://github.com/YantingShen-dev/fridge_app/releases/download/v1.2.3/smart-tag-android-v1.2.3.apk',
            size: 12_582_912,
          },
          {
            name: 'smart-tag-android-v1.2.3.apk.sha256',
            browser_download_url:
              'https://github.com/YantingShen-dev/fridge_app/releases/download/v1.2.3/smart-tag-android-v1.2.3.apk.sha256',
            size: 96,
          },
        ],
      }),
    ).toEqual({
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
    })
  })

  it('rejects prereleases, non-semantic tags, and releases without the matching APK', () => {
    const base = {
      tag_name: 'v1.2.3',
      name: 'Smart Tag v1.2.3',
      published_at: '2026-07-25T08:00:00Z',
      html_url: 'https://github.com/YantingShen-dev/fridge_app/releases/tag/v1.2.3',
      draft: false,
      prerelease: false,
      assets: [],
    }

    expect(() => parseLatestRelease({ ...base, prerelease: true })).toThrow(
      'stable semantic release',
    )
    expect(() => parseLatestRelease({ ...base, tag_name: 'demo-build' })).toThrow(
      'stable semantic release',
    )
    expect(() => parseLatestRelease(base)).toThrow('matching Android APK')
  })
})
