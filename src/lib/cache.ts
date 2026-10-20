// A small localStorage cache of the full link set (~100 links at this
// service's scale) so redirects can happen synchronously on a warm cache
// instead of waiting on a Firestore round-trip on every navigation.
//
// Entries never expire: a cache hit always redirects, however old. The cache
// is refreshed whenever the app loads its live link list, and on any miss
// (see redirectFlow.ts), so the only staleness is a link edited on another
// device redirecting to its old URL until this browser next refreshes.

export type CachedLink = {
  keyword: string
  kind: 'redirect' | 'tree' | 'alias'
  url: string
  target?: string
  description: string
  hits: number
}

const CACHE_KEY = 'golinks.cache.v2'
const CACHE_MAX_AGE_MS = 5 * 60 * 1000

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
    if (!entry || !Array.isArray(entry.links) || !Number.isFinite(entry.at)) return null
    if (Date.now() - entry.at > CACHE_MAX_AGE_MS) return null
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
  for (const link of links) {
    const segments = link.keyword.toLowerCase().split('/')
    for (let i = 1; i < segments.length; i++) {
      const keyword = segments.slice(0, i).join('/')
      if (!map.has(keyword)) {
        map.set(keyword, { keyword, kind: 'tree', url: '', target: '', description: '', hits: 0 })
      }
    }
  }
  return map
}
