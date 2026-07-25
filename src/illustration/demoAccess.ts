const STORAGE_KEY = 'smart-tag-demo-token'

export function readDemoToken(
  location: URL,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
) {
  const token = location.searchParams.get('demo')?.trim() ?? ''
  if (!token) return storage.getItem(STORAGE_KEY) ?? ''

  storage.setItem(STORAGE_KEY, token)
  location.searchParams.delete('demo')
  const cleanPath = `${location.pathname}${location.search}${location.hash}`
  window.history.replaceState(window.history.state, '', cleanPath)
  return token
}
