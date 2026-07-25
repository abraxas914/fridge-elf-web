const ALLOWED_ORIGINS = new Set([
  'https://fridge-elf-app.vercel.app',
  'https://fridgeelf.rth1.xyz',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
])

export function demoCorsHeaders(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && !ALLOWED_ORIGINS.has(origin)) return null

  const headers = new Headers({
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'cache-control': 'no-store',
    vary: 'Origin',
  })
  if (origin) headers.set('access-control-allow-origin', origin)
  return headers
}

export function demoJsonError(
  status: number,
  code: string,
  message: string,
  headers: Headers = new Headers({ 'cache-control': 'no-store' }),
) {
  return Response.json(
    { error: { code, message } },
    { status, headers },
  )
}
