import { handleDemoTranscribeRequest } from '../_lib/transcribe.js'

interface NodeRequest extends AsyncIterable<Uint8Array> {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
  url?: string
}

interface NodeResponse {
  status: (status: number) => NodeResponse
  setHeader: (name: string, value: string) => void
  send: (body: Buffer) => void
}

export const config = {
  api: { bodyParser: false },
  maxDuration: 300,
}

async function requestBody(request: NodeRequest) {
  if (Buffer.isBuffer(request.body)) return request.body
  if (request.body instanceof Uint8Array) {
    return Buffer.from(request.body)
  }
  if (typeof request.body === 'string') {
    return Buffer.from(request.body)
  }
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export default async function handler(
  request: NodeRequest,
  response: NodeResponse,
) {
  const headers = new Headers()
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(name, value)
    else if (Array.isArray(value)) headers.set(name, value.join(', '))
  }
  const method = request.method ?? 'GET'
  const body =
    method === 'POST'
      ? new Uint8Array(await requestBody(request))
      : undefined
  const webRequest = new Request(
    new URL(
      request.url ?? '/api/demo/transcribe',
      'https://demo.local',
    ),
    {
      method,
      headers,
      body,
    },
  )
  const webResponse = await handleDemoTranscribeRequest(
    webRequest,
    process.env,
  )
  response.status(webResponse.status)
  webResponse.headers.forEach((value, name) => {
    response.setHeader(name, value)
  })
  response.send(Buffer.from(await webResponse.arrayBuffer()))
}
