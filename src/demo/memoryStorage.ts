export type DemoStateStore = Pick<
  Storage,
  'clear' | 'getItem' | 'removeItem' | 'setItem'
>

export function createMemoryStorage(): DemoStateStore {
  const values = new Map<string, string>()
  return {
    clear() {
      values.clear()
    },
    getItem(key) {
      return values.get(key) ?? null
    },
    removeItem(key) {
      values.delete(key)
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
  }
}
