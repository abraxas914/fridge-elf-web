import { handleDemoSessionRequest } from '../_lib/demoSession.js'

interface NodeRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
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
  const headers = new Headers()
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(name, value)
    else if (Array.isArray(value)) headers.set(name, value.join(', '))
  }
  const webRequest = new Request(
    new URL(request.url ?? '/api/demo/session', 'https://demo.local'),
    { method: request.method ?? 'GET', headers },
  )
  const webResponse = handleDemoSessionRequest(webRequest, process.env)
  response.status(webResponse.status)
  webResponse.headers.forEach((value, name) => {
    response.setHeader(name, value)
  })
  response.send(Buffer.from(await webResponse.arrayBuffer()))
}
