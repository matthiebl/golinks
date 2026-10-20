// Shared "resolve, then either redirect or fall through to a miss UI" flow
// used by both entry points: Resolve.tsx (site-search / direct-path mode,
// go/xxx) and Home.tsx's handling of ?q= (default-search-engine mode).
//
// Normally main.tsx has already redirected on a cache hit before the app
// loads, so reaching here usually means a cold cache or a miss. Either way,
// a non-redirect outcome is confirmed against a fresh fetch of the whole
// collection — so a link created moments ago (this tab or another device)
// still resolves instead of false-missing — and that fetch refills the cache.

import { readCache, writeCache } from './cache'
import { resolveFromLinks, type ResolveKind } from './fastRedirect'
import { fetchAllLinks } from './links'
import { queueHit } from './pendingHits'
import { googleSearchUrl, type Destination } from './resolve'

export async function resolveAndConfirm(kind: ResolveKind, text: string): Promise<Destination> {
  const cached = readCache()
  if (cached) {
    const dest = resolveFromLinks(kind, text, cached)
    if (dest.type === 'redirect') return dest
  }

  const links = (await fetchAllLinks()).map(({ keyword, kind, url, description, hits }) => ({
    keyword,
    kind,
    url,
    description,
    hits,
  }))
  writeCache(links)
  return resolveFromLinks(kind, text, links)
}

/**
 * Acts on a resolved destination when it's a redirect or a Google fallback.
 * Returns true if it navigated away (caller should render nothing further);
 * false for 'create', 'tree', or 'home', which the caller renders itself.
 */
export function performRedirect(dest: Destination): boolean {
  if (dest.type === 'redirect') {
    queueHit(dest.matchedKeyword)
    window.location.replace(dest.url)
    return true
  }
  if (dest.type === 'google') {
    window.location.replace(googleSearchUrl(dest.query))
    return true
  }
  return false
}
