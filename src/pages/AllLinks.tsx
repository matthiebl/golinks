import { useMemo, useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import LinkTree from '../components/LinkTree'
import { useAuth } from '../hooks/useAuth'
import { useLinks } from '../hooks/useLinks'
import { deleteLink, type Link } from '../lib/links'
import { linkHref } from '../lib/linkHref'
import { queueHit } from '../lib/pendingHits'

type SortKey = 'keyword' | 'hits' | 'updatedAt'
type Row = Link & { inferred?: boolean }

function destination(url: string) {
  try { const parsed = new URL(url); return `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}` } catch { return url }
}

export default function AllLinks() {
  const { isOwner, signIn } = useAuth()
  const { links, loading, error, lookupMap } = useLinks()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | 'redirect' | 'tree'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('keyword')
  const [view, setView] = useState<'list' | 'tree'>('list')
  const [menu, setMenu] = useState<string | null>(null)
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice ?? '')

  const rows = useMemo<Row[]>(() => {
    const saved = new Set(links.map((link) => link.keyword))
    const inferred: Row[] = [...lookupMap.values()].filter((entry) => entry.kind === 'tree' && !saved.has(entry.keyword)).map((entry) => ({ ...entry, createdAt: null, updatedAt: null, lastUsedAt: null, inferred: true }))
    return [...links, ...inferred]
  }, [links, lookupMap])
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter((row) => (type === 'all' || row.kind === type) && (!term || `${row.keyword} ${row.description} ${row.url}`.toLowerCase().includes(term)))
      .sort((a, b) => sortKey === 'keyword' ? a.keyword.localeCompare(b.keyword) : sortKey === 'hits' ? b.hits - a.hits : (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))
  }, [rows, type, query, sortKey])
  const treeLinks = useMemo(() => links.filter((link) => visible.some((row) =>
    row.keyword === link.keyword || (row.kind === 'tree' && link.keyword.startsWith(`${row.keyword}/`)),
  )), [links, visible])
  const inferredCount = rows.filter((row) => row.inferred).length
  const proposedKeyword = query.trim().replace(/^go\//i, '')
  const canCreate = Boolean(proposedKeyword) && !rows.some((row) => row.keyword === proposedKeyword.toLowerCase())

  async function remove(link: Row) {
    setMenu(null)
    const explanation = link.kind === 'tree' ? ' Any children will remain.' : ''
    if (!window.confirm(`Delete go/${link.keyword}?${explanation} This can't be undone.`)) return
    try { await deleteLink(link.keyword); setNotice(`Deleted go/${link.keyword}`) }
    catch (caught) { setNotice(caught instanceof Error ? caught.message : 'Could not delete link.') }
  }

  async function copy(keyword: string) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/${keyword}`); setNotice(`Copied go/${keyword}`) }
    catch { setNotice('Could not copy the link.') }
    setMenu(null)
  }

  return <section className="gl-page-wide">
    <div className="flex flex-wrap items-start justify-between gap-4 mb-7"><div><h1 className="gl-title">Links</h1><p className="gl-subtitle mt-2">{links.length} saved {links.length === 1 ? 'link' : 'links'}{inferredCount ? ` · ${inferredCount} automatic ${inferredCount === 1 ? 'group' : 'groups'}` : ''}</p></div>{isOwner && <RouterLink to="/-/new" className="gl-btn gl-btn-primary">+ New link</RouterLink>}</div>
    {notice && <div role="status" className="gl-card px-4 py-3 mb-5 text-sm border-[#a9cba7] dark:border-[#52755b]">{notice}</div>}
    <div className="flex flex-wrap gap-3 mb-4 items-center">
      <input value={query} onChange={(event) => setQuery(event.target.value)} className="gl-input !w-auto flex-1 min-w-[200px]" aria-label="Search links" placeholder="Search keywords, descriptions, URLs" />
      <div className="flex rounded-lg bg-[#e9eef4] dark:bg-[#26303b] p-1" role="group" aria-label="Filter by type">{([['all','All'],['redirect','Redirects'],['tree','Groups']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setType(value)} aria-pressed={type === value} className={`px-3 py-2 rounded-md text-xs font-semibold ${type === value ? 'bg-white dark:bg-[#1a2028] shadow-sm' : 'gl-muted'}`}>{label}</button>)}</div>
      <select className="gl-input !w-auto" aria-label="Sort links" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}><option value="keyword">Keyword A–Z</option><option value="hits">Most used</option><option value="updatedAt">Recently updated</option></select>
      <div className="flex rounded-lg border border-[#cdd7e2] dark:border-[#485563] overflow-hidden" role="group" aria-label="View links"><button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} className={`px-3 py-2 text-sm ${view === 'list' ? 'bg-[#eaf2fc] dark:bg-[#17314f] font-semibold' : ''}`}>List</button><button type="button" aria-pressed={view === 'tree'} onClick={() => setView('tree')} className={`px-3 py-2 text-sm ${view === 'tree' ? 'bg-[#eaf2fc] dark:bg-[#17314f] font-semibold' : ''}`}>Tree</button></div>
    </div>
    {error ? <p role="alert" className="text-red-700 dark:text-red-300 text-sm py-8">Couldn’t load links: {error.message}</p> : loading && !links.length ? <p className="gl-muted text-sm py-8">Loading links…</p> : !visible.length ? <div className="gl-card p-8 text-center text-sm gl-muted"><p>{links.length ? 'No links match this search.' : 'No links yet.'}</p><div className="flex flex-wrap gap-3 justify-center mt-4">{canCreate && (isOwner ? <RouterLink className="gl-btn gl-btn-primary" to={`/-/new?keyword=${encodeURIComponent(proposedKeyword)}`}>+ Create go/{proposedKeyword}</RouterLink> : <button className="gl-btn gl-btn-primary" onClick={() => void signIn().catch(() => {})}>Sign in to create go/{proposedKeyword}</button>)}{links.length > 0 && <button className="gl-btn" onClick={() => { setQuery(''); setType('all') }}>Clear filters</button>}</div></div> : view === 'tree' ? <LinkTree links={treeLinks} isOwner={isOwner} /> : <div className="gl-card overflow-visible"><div className="hidden sm:grid grid-cols-[2fr_2fr_70px_95px_60px] gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-wide gl-muted"><span>Keyword</span><span>Destination / details</span><span>Opens</span><span>Updated</span><span>Actions</span></div>{visible.map((link) => <div key={link.keyword} className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_2fr_70px_95px_60px] gap-x-3 gap-y-1 items-center px-4 py-3 border-t border-[#e6ebf0] dark:border-[#333d48] text-sm"><div className="min-w-0"><a href={linkHref(link)} onClick={() => { if (link.kind === 'redirect') queueHit(link.keyword) }} className="font-mono font-semibold text-inherit no-underline hover:underline block truncate">go/{link.keyword}</a><span className="block text-xs gl-muted truncate mt-1">{link.description || (link.inferred ? 'Automatic group' : link.kind === 'tree' ? 'Group of links' : '')}</span></div><span className="min-w-0 truncate gl-muted col-start-1 sm:col-auto">{link.kind === 'tree' ? `${rows.filter((row) => row.keyword.startsWith(`${link.keyword}/`) && row.kind === 'redirect').length} links${link.inferred ? ' · automatic group' : ''}` : destination(link.url)}</span><span className="hidden sm:block gl-muted tabular-nums">{link.kind === 'tree' ? '—' : link.hits}</span><span className="hidden sm:block gl-muted">{link.updatedAt?.toDate().toLocaleDateString() ?? '—'}</span><div className="relative col-start-2 row-start-1 row-span-2 sm:col-auto sm:row-auto"><button type="button" className="gl-btn !min-w-10 !px-2" aria-label={`Actions for go/${link.keyword}`} aria-expanded={menu === link.keyword} onClick={() => setMenu(menu === link.keyword ? null : link.keyword)}>•••</button>{menu === link.keyword && <div className="absolute right-0 top-full mt-1 z-10 gl-card min-w-36 p-1 shadow-lg flex flex-col items-stretch">{isOwner && <RouterLink className="px-3 py-2 hover:bg-[#edf2f7] dark:hover:bg-[#26303b] rounded-md" to={link.inferred ? `/-/new?keyword=${encodeURIComponent(link.keyword)}&kind=tree&from=%2F-%2Fall` : `/-/edit/${link.keyword}?from=%2F-%2Fall`}>{link.inferred ? 'Add description' : 'Edit'}</RouterLink>}<button type="button" onClick={() => void copy(link.keyword)} className="px-3 py-2 text-left hover:bg-[#edf2f7] dark:hover:bg-[#26303b] rounded-md">Copy go link</button>{isOwner && !link.inferred && <button type="button" onClick={() => void remove(link)} className="px-3 py-2 text-left text-red-700 dark:text-red-300 hover:bg-[#edf2f7] dark:hover:bg-[#26303b] rounded-md">Delete</button>}</div>}</div></div>)}</div>}
  </section>
}
