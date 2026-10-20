// Pure keyword resolution logic — no Firebase imports, no DOM/browser APIs.
// Callers supply a synchronous `lookup(candidateKeyword) => link | undefined`
// (backed by a cache, Firestore snapshot, or anything else) so this stays
// trivially unit-testable.

export type ResolvableLink = {
  keyword: string
  kind?: 'redirect' | 'tree'
  url: string
}

export type Lookup = (candidateKeyword: string) => ResolvableLink | undefined

export type MissMode = 'create' | 'google'

export type Destination =
  | { type: 'redirect'; url: string; matchedKeyword: string }
  | { type: 'tree'; keyword: string }
  | { type: 'create'; keyword: string }
  | { type: 'google'; query: string }
  | { type: 'home' }

type Match = { link: ResolvableLink; remainder: string }

/** Split a raw path/keyword into segments, preserving case, dropping empties. */
export function splitSegments(raw: string): string[] {
  return raw
    .split('/')
    .map((s) => {
      try {
        return decodeURIComponent(s)
      } catch {
        return s
      }
    })
    .filter((s) => s.length > 0)
}

/**
 * Try the full keyword, then progressively shorter prefixes, so
 * "go/a/b/c" resolves against a link at "a/b" if "a/b/c" isn't defined,
 * carrying "c" forward as the remainder.
 */
function matchSegments(segments: string[], lookup: Lookup): Match | null {
  for (let i = segments.length; i >= 1; i--) {
    const candidate = segments.slice(0, i).join('/').toLowerCase()
    const link = lookup(candidate)
    if (link) {
      return { link, remainder: segments.slice(i).join('/') }
    }
  }
  return null
}

/** Re-encode a path-shaped remainder before appending it to a destination URL. */
function appendPathRemainder(url: string, remainder: string): string {
  if (!remainder) return url
  const encoded = remainder.split('/').map(encodeURIComponent).join('/')
  return `${url.replace(/\/+$/, '')}/${encoded}`
}

const PLACEHOLDER_RE = /\{\*\}|%s/g

function hasPlaceholder(url: string): boolean {
  return url.includes('{*}') || url.includes('%s')
}

/** Build the final destination URL for a match given its remainder text. */
export function buildDestinationUrl(url: string, remainder: string): string {
  if (hasPlaceholder(url)) {
    return url.replace(PLACEHOLDER_RE, encodeURIComponent(remainder))
  }
  return appendPathRemainder(url, remainder)
}

/**
 * Resolve a request path such as "/a/b/c" (site-search / direct-visit mode).
 * On a miss, `missMode` decides whether to land on the create form or
 * forward straight to Google.
 */
export function resolvePath(
  pathname: string,
  lookup: Lookup,
  missMode: MissMode = 'create',
): Destination {
  const segments = splitSegments(pathname)
  if (segments.length === 0) return { type: 'home' }

  const match = matchSegments(segments, lookup)
  if (match) {
    if (match.link.kind === 'tree') {
      if (!match.remainder) return { type: 'tree', keyword: match.link.keyword }
    } else {
      return {
        type: 'redirect',
        url: buildDestinationUrl(match.link.url, match.remainder),
        matchedKeyword: match.link.keyword,
      }
    }
  }

  const keyword = segments.join('/').toLowerCase()
  if (missMode === 'google') {
    return { type: 'google', query: segments.join(' ') }
  }
  return { type: 'create', keyword }
}

/**
 * Resolve a `?q=` search-engine-mode query, e.g. "gh mhiebl/golinks".
 * The first whitespace-delimited token is the keyword candidate; anything
 * after it is the remainder/argument. A miss always forwards to Google.
 */
export function resolveQuery(queryText: string, lookup: Lookup): Destination {
  const trimmed = queryText.trim()
  if (!trimmed) return { type: 'home' }

  const [first, ...rest] = trimmed.split(/\s+/)
  const argText = rest.join(' ')
  const segments = splitSegments(first)

  const match = matchSegments(segments, lookup)
  if (match) {
    if (match.link.kind === 'tree') {
      if (!match.remainder && !argText) return { type: 'tree', keyword: match.link.keyword }
      return { type: 'google', query: trimmed }
    }
    const combined = [match.remainder, argText].filter(Boolean).join(' ')
    return {
      type: 'redirect',
      url: buildDestinationUrl(match.link.url, combined),
      matchedKeyword: match.link.keyword,
    }
  }

  return { type: 'google', query: trimmed }
}

export function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
