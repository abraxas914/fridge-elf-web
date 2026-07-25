import { parseLatestRelease } from '../../src/release/release.js'

export interface ReleaseEnvironment {
  GITHUB_RELEASE_TOKEN?: string
}

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

const RELEASE_URL =
  'https://api.github.com/repos/YantingShen-dev/fridge_app/releases/latest'

function errorResponse(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    {
      status,
      headers: { 'cache-control': 'no-store' },
    },
  )
}

async function loadRelease(
  environment: ReleaseEnvironment,
  fetcher: Fetcher,
) {
  const publicHeaders: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'fridge-elf-release-gateway',
    'x-github-api-version': '2022-11-28',
  }
  const headers = { ...publicHeaders }
  if (environment.GITHUB_RELEASE_TOKEN) {
    headers.authorization = `Bearer ${environment.GITHUB_RELEASE_TOKEN}`
  }
  let response = await fetcher(RELEASE_URL, { headers })
  if (response.status === 404 && environment.GITHUB_RELEASE_TOKEN) {
    response = await fetcher(RELEASE_URL, { headers: publicHeaders })
  }
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`GitHub release API returned ${response.status}`)
  try {
    return parseLatestRelease(await response.json())
  } catch {
    return null
  }
}

export async function handleLatestReleaseRequest(
  request: Request,
  environment: ReleaseEnvironment,
  fetcher: Fetcher = fetch,
) {
  if (request.method !== 'GET') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', '仅支持 GET 请求')
  }
  try {
    const release = await loadRelease(environment, fetcher)
    if (!release) {
      return errorResponse(404, 'NO_RELEASE', '暂无可下载的正式 APK')
    }
    return Response.json(release, {
      headers: {
        'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  } catch {
    return errorResponse(502, 'RELEASE_UPSTREAM_FAILED', '版本服务暂时不可用')
  }
}

export async function handleAndroidDownloadRequest(
  request: Request,
  environment: ReleaseEnvironment,
  fetcher: Fetcher = fetch,
) {
  if (request.method !== 'GET') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', '仅支持 GET 请求')
  }
  try {
    const release = await loadRelease(environment, fetcher)
    if (!release) {
      return errorResponse(404, 'NO_RELEASE', '暂无可下载的正式 APK')
    }
    return Response.redirect(release.apkUrl, 307)
  } catch {
    return errorResponse(502, 'RELEASE_UPSTREAM_FAILED', '版本服务暂时不可用')
  }
}
