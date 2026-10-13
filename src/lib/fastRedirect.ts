// Cache-only resolution, shared by the pre-app fast path (main.tsx) and the
// in-app redirect flow. Must not import Firebase or React — this module is
// part of the tiny entry chunk that runs before either is downloaded.

import { buildLookupMap, readCache, type CachedLink } from './cache'
import { queueHit } from './pendingHits'
import { resolvePath, resolveQuery, type Destination, type Lookup } from './resolve'
import { getSettings } from './settings'

export type ResolveKind = 'path' | 'query'

export function resolveFromLinks(
  kind: ResolveKind,
  text: string,
  links: CachedLink[],
): Destination {
  const map = buildLookupMap(links)
  const lookup: Lookup = (key) => map.get(key)
  return kind === 'path'
    ? resolvePath(text, lookup, getSettings().pathMiss)
    : resolveQuery(text, lookup)
}

/** Which kind of resolution the current URL calls for, or null for app pages. */
function currentRequest(): { kind: ResolveKind; text: string } | null {
  const { pathname, search } = window.location
  if (pathname === '/' || pathname === '') {
    const q = new URLSearchParams(search).get('q')
    return q ? { kind: 'query', text: q } : null
  }
  if (pathname.startsWith('/-/')) return null
  return { kind: 'path', text: pathname }
}

/**
 * Redirects immediately if the cache has a match for the current URL.
 * Returns true if it navigated away. Misses are left to the full app, which
 * confirms them against Firestore before showing a miss.
 */
export function tryFastRedirect(): boolean {
  const request = currentRequest()
  if (!request) return false
  const cached = readCache()
  if (!cached) return false

  const dest = resolveFromLinks(request.kind, request.text, cached)
  if (dest.type !== 'redirect') return false

  queueHit(dest.matchedKeyword)
  window.location.replace(dest.url)
  return true
}
