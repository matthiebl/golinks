import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLinks } from '../hooks/useLinks'
import { performRedirect, resolveAndConfirm } from '../lib/redirectFlow'
import { googleSearchUrl, type Destination } from '../lib/resolve'
import { linkHref } from '../lib/linkHref'
import { queueHit } from '../lib/pendingHits'
import TreePage from './TreePage'

export default function Resolve() {
  const location = useLocation()
  // Keyed by pathname so navigating to a different keyword remounts this
  // (fresh `destination` state) rather than needing to reset it in an effect.
  return <ResolveForPath key={location.pathname} pathname={location.pathname} />
}

function ResolveForPath({ pathname }: { pathname: string }) {
  const [destination, setDestination] = useState<Destination | null>(null)

  useEffect(() => {
    let cancelled = false

    resolveAndConfirm('path', pathname).then((dest) => {
      if (cancelled) return
      if (!performRedirect(dest)) {
        setDestination(dest)
      }
    })

    return () => {
      cancelled = true
    }
  }, [pathname])

  if (!destination) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-600 py-24">
        Looking up <span className="font-mono">{pathname}</span>…
      </div>
    )
  }

  if (destination.type === 'tree') return <TreePage keyword={destination.keyword} />

  if (destination.type === 'broken-alias') return <section className="gl-page"><h1 className="gl-title font-mono">go/{destination.keyword}</h1><p role="alert" className="gl-subtitle mt-3">This alias points to go/{destination.target || '(missing target)'}, which is no longer a redirect link.</p><Link to="/-/all" className="gl-btn mt-6">Browse links</Link></section>

  if (destination.type !== 'create') {
    // 'home': nothing to show. 'redirect'/'google' are handled by
    // performRedirect above and never reach state, but TS can't see that.
    return null
  }

  return <MissingLink keyword={destination.keyword} />
}

function MissingLink({ keyword }: { keyword: string }) {
  const { isOwner, signIn } = useAuth()
  const { lookupMap } = useLinks()
  const prefix = keyword.split('/')[0]
  const nearby = [...lookupMap.values()]
    .filter((link) => link.keyword !== keyword && (link.keyword.startsWith(`${prefix}/`) || link.keyword.includes(keyword)))
    .sort((a, b) => a.keyword.localeCompare(b.keyword))
    .slice(0, 3)

  return <section className="gl-page">
    <nav className="gl-breadcrumb" aria-label="Breadcrumb"><Link to="/">Search</Link> / No match</nav>
    <div className="pt-6"><span className="gl-pill">NO MATCH</span><h1 className="gl-title font-mono mt-4">go/{keyword}</h1><p className="gl-subtitle mt-3 max-w-xl">There isn’t a link at this path yet. Create it, try a nearby link, or search the web.</p>
      <div className="flex flex-wrap gap-3 mt-6">
        {isOwner ? <Link className="gl-btn gl-btn-primary" to={`/-/new?keyword=${encodeURIComponent(keyword)}`}>+ Create go/{keyword}</Link> : <button className="gl-btn gl-btn-primary" onClick={() => void signIn().catch(() => {})}>Sign in to create</button>}
        <a className="gl-btn" href={googleSearchUrl(keyword.split('/').join(' '))}>Search Google ↗</a>
      </div>
    </div>
    {nearby.length > 0 && <div className="mt-12"><div className="gl-section-heading"><h2>Nearby links</h2></div><div className="gl-card overflow-hidden">{nearby.map((link) => <a key={link.keyword} href={linkHref(link)} onClick={() => { if (link.kind === 'redirect') queueHit(link.keyword) }} className="gl-row no-underline text-inherit"><span className="min-w-0 flex-1"><span className="font-mono font-semibold text-sm">go/{link.keyword}</span><span className="block text-xs gl-muted mt-1 truncate">{link.description || (link.kind === 'tree' ? 'Group of links' : link.kind === 'alias' ? `→ go/${link.target}` : link.url)}</span></span>{link.kind === 'tree' && <span className="gl-pill">GROUP</span>}{link.kind === 'alias' && <span className="gl-pill">ALIAS</span>}<span className="gl-muted">{link.kind === 'tree' ? '›' : '↗'}</span></a>)}</div></div>}
  </section>
}
