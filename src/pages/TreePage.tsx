import { Link as RouterLink, useLocation } from 'react-router-dom'
import LinkTree from '../components/LinkTree'
import { useAuth } from '../hooks/useAuth'
import { useLinks } from '../hooks/useLinks'
import { linkHref } from '../lib/linkHref'
import { queueHit } from '../lib/pendingHits'

export default function TreePage({ keyword }: { keyword: string }) {
  const { isOwner } = useAuth()
  const location = useLocation()
  const { links, loading, error, lookupMap } = useLinks()
  const tree = lookupMap.get(keyword)
  const saved = links.find((link) => link.keyword === keyword && link.kind === 'tree')
  const segments = keyword.split('/')
  const descendants = links.filter((link) => link.keyword.startsWith(`${keyword}/`))
  const redirectCount = descendants.filter((link) => link.kind !== 'tree').length

  if (loading && !tree) return <div className="gl-page text-center gl-muted py-20">Loading group…</div>
  if (error) return <p className="gl-page text-center text-red-700 dark:text-red-300 py-12">Couldn’t load group: {error.message}</p>
  if (tree?.kind !== 'tree') return <p className="gl-page text-center py-12">This group is no longer available.</p>

  return (
    <section className="gl-page">
      {(location.state as { notice?: string } | null)?.notice && <div role="status" className="gl-card px-4 py-3 mb-5 text-sm border-[#a9cba7] dark:border-[#52755b]">{(location.state as { notice?: string }).notice}</div>}
      <nav aria-label="Breadcrumb" className="gl-breadcrumb"><RouterLink to="/">go</RouterLink>{segments.map((segment, index) => { const path = segments.slice(0, index + 1).join('/'); const ancestor = lookupMap.get(path); return <span key={path}> <span className="mx-1">/</span> {index === segments.length - 1 ? <strong>{segment}</strong> : <a href={ancestor ? linkHref(ancestor) : `/${path}`} onClick={() => { if (ancestor?.kind === 'redirect') queueHit(path) }}>{segment}</a>}</span> })}</nav>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8"><div><h1 className="gl-title font-mono">go/{keyword}</h1><p className="gl-subtitle mt-2">{tree.description || `${redirectCount} ${redirectCount === 1 ? 'link' : 'links'} across all levels`}</p></div>{isOwner && <RouterLink className="gl-btn gl-btn-primary" to={`/-/new?keyword=${encodeURIComponent(`${keyword}/`)}&from=${encodeURIComponent(`/${keyword}`)}`}>+ Add child</RouterLink>}</div>
      <div className="gl-section-heading"><h2>All descendants</h2>{isOwner && (saved ? <RouterLink className="gl-text-link" to={`/-/edit/${keyword}?from=${encodeURIComponent(`/${keyword}`)}`}>Edit group</RouterLink> : <RouterLink className="gl-text-link" to={`/-/new?keyword=${encodeURIComponent(keyword)}&kind=tree&from=${encodeURIComponent(`/${keyword}`)}`}>Add description</RouterLink>)}</div>
      <LinkTree links={links} rootKeyword={keyword} isOwner={isOwner} />
    </section>
  )
}
