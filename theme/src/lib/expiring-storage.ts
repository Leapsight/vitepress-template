/**
 * Tiny localStorage wrapper whose entries expire after a number of
 * minutes. Used by <Tabs> to remember the last selected tab per page.
 */
class ExpiringStorage {
  get(key: string): unknown {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(key)
    if (!raw) return null

    let cached: { value: unknown; expires: string }
    try {
      cached = JSON.parse(raw)
    } catch {
      localStorage.removeItem(key)
      return null
    }

    if (new Date(cached.expires) < new Date()) {
      localStorage.removeItem(key)
      return null
    }
    return cached.value
  }

  set(key: string, value: unknown, lifeTimeInMinutes: number): void {
    if (typeof localStorage === 'undefined') return
    const expires = new Date(Date.now() + lifeTimeInMinutes * 60000)
    localStorage.setItem(key, JSON.stringify({ value, expires }))
  }
}

export default new ExpiringStorage()
