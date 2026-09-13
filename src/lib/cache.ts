// A small localStorage cache of the full link set (~100 links at this
// service's scale) so redirects can happen synchronously on a warm cache
// instead of waiting on a Firestore round-trip on every navigation.

export type CachedLink = {
  keyword: string
  url: string
  description: string
  hits: number
}

const CACHE_KEY = 'golinks.cache.v1'
const TTL_MS = 10 * 60 * 1000 // 10 minutes

type CacheEntry = { at: number; links: CachedLink[] }

export function writeCache(links: CachedLink[]): void {
  try {
    const entry: CacheEntry = { at: Date.now(), links }
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // Storage unavailable or full — cache is a pure optimization, skip it.
  }
}

export function readCache(): CachedLink[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (!entry || !Array.isArray(entry.links)) return null
    if (Date.now() - entry.at > TTL_MS) return null
    return entry.links
  } catch {
    return null
  }
}

export function buildLookupMap(links: CachedLink[]): Map<string, CachedLink> {
  const map = new Map<string, CachedLink>()
  for (const link of links) {
    map.set(link.keyword.toLowerCase(), link)
  }
  return map
}
