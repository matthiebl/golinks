// Shared "resolve, then either redirect or fall through to a miss UI" flow
// used by both entry points: Resolve.tsx (site-search / direct-path mode,
// go/xxx) and Home.tsx's handling of ?q= (default-search-engine mode).
//
// Both first try the synchronous localStorage cache for an instant redirect,
// then always confirm a non-redirect outcome against Firestore directly —
// so a link created moments ago (this tab or another device) still resolves
// instead of false-missing on a stale/cold cache.

import { buildLookupMap, readCache } from './cache'
import { bumpHit, getLink } from './links'
import {
  buildDestinationUrl,
  googleSearchUrl,
  resolvePath,
  resolveQuery,
  splitSegments,
  type Destination,
  type Lookup,
  type MissMode,
} from './resolve'
import { getSettings } from './settings'

async function resolvePathAsync(pathname: string, missMode: MissMode): Promise<Destination> {
  const segments = splitSegments(pathname)
  if (segments.length === 0) return { type: 'home' }

  for (let i = segments.length; i >= 1; i--) {
    const candidate = segments.slice(0, i).join('/').toLowerCase()
    const link = await getLink(candidate)
    if (link) {
      const remainder = segments.slice(i).join('/')
      return {
        type: 'redirect',
        url: buildDestinationUrl(link.url, remainder),
        matchedKeyword: link.keyword,
      }
    }
  }

  if (missMode === 'google') return { type: 'google', query: segments.join(' ') }
  return { type: 'create', keyword: segments.join('/').toLowerCase() }
}

async function resolveQueryAsync(queryText: string): Promise<Destination> {
  const trimmed = queryText.trim()
  if (!trimmed) return { type: 'home' }

  const [first, ...rest] = trimmed.split(/\s+/)
  const argText = rest.join(' ')
  const segments = splitSegments(first)

  for (let i = segments.length; i >= 1; i--) {
    const candidate = segments.slice(0, i).join('/').toLowerCase()
    const link = await getLink(candidate)
    if (link) {
      const remainder = segments.slice(i).join('/')
      const combined = [remainder, argText].filter(Boolean).join(' ')
      return {
        type: 'redirect',
        url: buildDestinationUrl(link.url, combined),
        matchedKeyword: link.keyword,
      }
    }
  }

  return { type: 'google', query: trimmed }
}

export async function resolveAndConfirm(
  kind: 'path' | 'query',
  text: string,
): Promise<Destination> {
  const missMode = getSettings().pathMiss
  const cached = readCache()

  if (cached) {
    const map = buildLookupMap(cached)
    const lookup: Lookup = (key) => map.get(key)
    const dest = kind === 'path' ? resolvePath(text, lookup, missMode) : resolveQuery(text, lookup)
    if (dest.type === 'redirect') return dest
  }

  return kind === 'path' ? resolvePathAsync(text, missMode) : resolveQueryAsync(text)
}

/**
 * Acts on a resolved destination when it's a redirect or a Google fallback.
 * Returns true if it navigated away (caller should render nothing further);
 * false for 'create' or 'home', which the caller renders itself.
 */
export function performRedirect(dest: Destination): boolean {
  if (dest.type === 'redirect') {
    bumpHit(dest.matchedKeyword)
    window.location.replace(dest.url)
    return true
  }
  if (dest.type === 'google') {
    window.location.replace(googleSearchUrl(dest.query))
    return true
  }
  return false
}
