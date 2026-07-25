const STORAGE_KEY = 'fridge-elf-demo-token'
const LEGACY_STORAGE_KEY = 'smart-tag-demo-token'

export function readDemoToken(
  location: URL,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
) {
  const token = location.searchParams.get('demo')?.trim() ?? ''
  if (!token) {
    const current = storage.getItem(STORAGE_KEY)
    if (current) return current
    const legacy = storage.getItem(LEGACY_STORAGE_KEY) ?? ''
    if (legacy) storage.setItem(STORAGE_KEY, legacy)
    return legacy
  }

  storage.setItem(STORAGE_KEY, token)
  location.searchParams.delete('demo')
  const cleanPath = `${location.pathname}${location.search}${location.hash}`
  window.history.replaceState(window.history.state, '', cleanPath)
  return token
}
