import { handleAndroidDownloadRequest } from './_lib/releases.js'

interface NodeRequest {
  method?: string
  url?: string
}

interface NodeResponse {
  status: (status: number) => NodeResponse
  setHeader: (name: string, value: string) => void
  send: (body: Buffer) => void
}

export default async function handler(
  request: NodeRequest,
  response: NodeResponse,
) {
  const webResponse = await handleAndroidDownloadRequest(
    new Request(
      new URL(request.url ?? '/api/download/android', 'https://fridgeelf.rth1.xyz'),
      { method: request.method ?? 'GET' },
    ),
    process.env,
  )
  response.status(webResponse.status)
  webResponse.headers.forEach((value, name) => response.setHeader(name, value))
  response.send(Buffer.from(await webResponse.arrayBuffer()))
}
