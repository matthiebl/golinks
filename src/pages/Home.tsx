import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import { useLinks } from '../hooks/useLinks'
import { performRedirect, resolveAndConfirm } from '../lib/redirectFlow'
import type { Lookup } from '../lib/resolve'
import { linkHref } from '../lib/linkHref'
import { queueHit } from '../lib/pendingHits'

function destinationLabel(url: string) {
  try { return new URL(url).hostname } catch { return url }
}

export default function Home() {
  const { links, loading, error, lookupMap } = useLinks()
  const [params] = useSearchParams()
  const queryParam = params.get('q')
  const prefill = params.get('new')
  const [queryError, setQueryError] = useState('')

  useEffect(() => {
    if (!queryParam) return
    let cancelled = false
    resolveAndConfirm('query', queryParam).then((dest) => {
      if (cancelled) return
      if (dest.type === 'tree') window.location.replace(`/${dest.keyword}`)
      else if (dest.type === 'broken-alias') setQueryError(`go/${dest.keyword} points to go/${dest.target || '(missing target)'}, which is no longer a redirect link.`)
      else performRedirect(dest)
    })
    return () => { cancelled = true }
  }, [queryParam])

  if (queryParam) return <div className="gl-page text-center py-20">{queryError ? <p role="alert">{queryError}</p> : <p className="gl-muted">Searching for <span className="font-mono">{queryParam}</span>…</p>}</div>
  if (prefill !== null) return <Navigate replace to={`/-/new?keyword=${encodeURIComponent(prefill)}${params.get('kind') === 'tree' ? '&kind=tree' : ''}`} />

  const lookup: Lookup = (key) => lookupMap.get(key)
  const recent = [...links].filter((link) => link.kind !== 'tree' && link.lastUsedAt)
    .sort((a, b) => (b.lastUsedAt?.toMillis() ?? 0) - (a.lastUsedAt?.toMillis() ?? 0)).slice(0, 4)
  const useful = recent.length ? recent : [...links].filter((link) => link.kind !== 'tree')
    .sort((a, b) => b.hits - a.hits).slice(0, 4)

  return (
    <div className="gl-page">
      <h1 className="gl-title">Find a link</h1>
      <p className="gl-subtitle mt-2 mb-7">Type a keyword or search your saved links.</p>
      <SearchBar links={links} lookup={lookup} />
      <section className="mt-12">
        <div className="gl-section-heading"><h2>{recent.length ? 'Recently useful' : 'Frequently used'}</h2><Link className="gl-text-link" to="/-/all">Browse all links →</Link></div>
        {error ? <p className="gl-muted text-sm">Couldn’t load links: {error.message}</p> : loading && !links.length ? <p className="gl-muted text-sm">Loading links…</p> : useful.length ? (
          <div className="gl-card overflow-hidden">
            {useful.map((link) => <a key={link.keyword} href={linkHref(link)} onClick={() => { if (link.kind === 'redirect') queueHit(link.keyword) }} className="gl-row no-underline text-inherit"><span className="min-w-0 flex-1"><span className="font-mono font-semibold text-sm">go/{link.keyword}</span><span className="block truncate text-xs gl-muted mt-1">{link.description || (link.kind === 'alias' ? `→ go/${link.target}` : destinationLabel(link.url))}</span></span><span className="text-sm gl-muted">↗</span></a>)}
          </div>
        ) : <div className="gl-card p-7 text-center text-sm gl-muted">No links yet. Use New link to create your first shortcut.</div>}
      </section>
    </div>
  )
}
