export interface ReleaseInfo {
  tagName: string
  title: string
  publishedAt: string
  releaseUrl: string
  apkName: string
  apkUrl: string
  apkSize: number
  checksumUrl: string | null
}

interface GitHubAsset {
  name?: unknown
  browser_download_url?: unknown
  size?: unknown
}

interface GitHubRelease {
  tag_name?: unknown
  name?: unknown
  published_at?: unknown
  html_url?: unknown
  draft?: unknown
  prerelease?: unknown
  assets?: unknown
}

const SEMANTIC_TAG = /^v\d+\.\d+\.\d+$/

export function parseLatestRelease(payload: unknown): ReleaseInfo {
  const release = payload as GitHubRelease
  const tagName =
    typeof release?.tag_name === 'string' ? release.tag_name : ''
  if (
    !SEMANTIC_TAG.test(tagName) ||
    release.draft === true ||
    release.prerelease === true
  ) {
    throw new Error('GitHub response is not a stable semantic release')
  }

  const assets = Array.isArray(release.assets)
    ? (release.assets as GitHubAsset[])
    : []
  const apkName = `fridge-elf-android-${tagName}.apk`
  const apk = assets.find((asset) => asset.name === apkName)
  if (
    !apk ||
    typeof apk.browser_download_url !== 'string' ||
    typeof apk.size !== 'number'
  ) {
    throw new Error('GitHub release has no matching Android APK')
  }
  const checksum = assets.find(
    (asset) => asset.name === `${apkName}.sha256`,
  )

  return {
    tagName,
    title:
      typeof release.name === 'string' && release.name.trim()
        ? release.name
        : `Fridge Elf ${tagName}`,
    publishedAt:
      typeof release.published_at === 'string'
        ? release.published_at
        : '',
    releaseUrl:
      typeof release.html_url === 'string' ? release.html_url : '',
    apkName,
    apkUrl: apk.browser_download_url,
    apkSize: apk.size,
    checksumUrl:
      typeof checksum?.browser_download_url === 'string'
        ? checksum.browser_download_url
        : null,
  }
}

export function formatApkSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
