import { useEffect, useState } from 'react'
import { buildLookupMap, readCache, writeCache, type CachedLink } from '../lib/cache'
import { subscribeLinks, type Link } from '../lib/links'

/**
 * Live-subscribes to the `links` collection, keeping the localStorage cache
 * in sync with every change (own edits included) so other tabs/loads on
 * this machine get instant, cache-only resolution.
 */
export function useLinks() {
  const [links, setLinks] = useState<Link[]>(() => {
    const cached = readCache()
    if (!cached) return []
    return cached.map((c) => ({
      keyword: c.keyword,
      kind: c.kind,
      url: c.url,
      target: c.target ?? '',
      description: c.description,
      hits: c.hits,
      createdAt: null,
      updatedAt: null,
      lastUsedAt: null,
    }))
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeLinks(
      (next) => {
        setLinks(next)
        setLoading(false)
        setError(null)
        const cacheable: CachedLink[] = next.map((l) => ({
          keyword: l.keyword,
          kind: l.kind,
          url: l.url,
          target: l.target,
          description: l.description,
          hits: l.hits,
        }))
        writeCache(cacheable)
      },
      (err) => {
        setLoading(false)
        setError(err)
      },
    )
    return unsubscribe
  }, [])

  const lookupMap = buildLookupMap(
    links.map((l) => ({ keyword: l.keyword, kind: l.kind, url: l.url, target: l.target, description: l.description, hits: l.hits })),
  )

  return { links, loading, error, lookupMap }
}
