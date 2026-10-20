import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import LinkForm, { type LinkFormValues } from '../components/LinkForm'
import { useAuth } from '../hooks/useAuth'
import { deleteLink, getLink, updateLink, type Link } from '../lib/links'
import { useLinks } from '../hooks/useLinks'

export default function EditLink() {
  const params = useParams()
  const keyword = (params['*'] ?? '').toLowerCase()
  return <EditLinkForKeyword key={keyword} keyword={keyword} />
}

function EditLinkForKeyword({ keyword }: { keyword: string }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const from = params.get('from')
  const returnTo = from?.startsWith('/') && !from.startsWith('//') ? from : '/-/all'
  const { isOwner, loading: authLoading } = useAuth()
  const { links } = useLinks()
  const [link, setLink] = useState<Link | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let cancelled = false
    getLink(keyword).then((found) => {
      if (cancelled) return
      if (found) setLink(found)
      else setNotFound(true)
    }).catch((error) => { if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Could not load this link.') })
    return () => { cancelled = true }
  }, [keyword])

  async function handleSubmit(values: LinkFormValues) {
    await updateLink(keyword, values)
    navigate(returnTo, { state: { notice: `Saved go/${keyword}` } })
  }

  async function handleDelete() {
    const extra = link?.kind === 'tree' ? ' Its child links will remain.' : ''
    const aliases = links.filter((item) => item.kind === 'alias' && item.target === keyword)
    const aliasWarning = aliases.length ? ` ${aliases.length} ${aliases.length === 1 ? 'alias' : 'aliases'} will stop working.` : ''
    if (!window.confirm(`Delete go/${keyword}?${extra}${aliasWarning} This can't be undone.`)) return
    try { await deleteLink(keyword); navigate(returnTo, { state: { notice: `Deleted go/${keyword}` } }) }
    catch (error) { setDeleteError(error instanceof Error ? error.message : 'Could not delete link.') }
  }

  if (authLoading) return <p className="gl-page gl-muted">Checking account…</p>
  if (!isOwner) return <section className="gl-page"><h1 className="gl-title">Sign in to edit</h1><p className="gl-subtitle mt-3">Only the owner can change links.</p></section>
  if (loadError) return <p className="gl-page text-red-700 dark:text-red-300" role="alert">{loadError}</p>
  if (notFound) return <section className="gl-page"><h1 className="gl-title">Link not found</h1><p className="gl-subtitle mt-3">No saved link exists for <span className="font-mono">go/{keyword}</span>.</p><RouterLink to="/-/all" className="gl-btn mt-6">Back to links</RouterLink></section>
  if (!link) return <p className="gl-page gl-muted">Loading link…</p>

  return <section className="gl-page"><nav className="gl-breadcrumb" aria-label="Breadcrumb"><RouterLink to={returnTo}>Links</RouterLink> / Edit</nav><h1 className="gl-title font-mono">go/{keyword}</h1><p className="gl-subtitle mt-2 mb-6">Edit this shortcut and save your changes.</p><LinkForm mode="edit" initial={{ keyword: link.keyword, kind: link.kind, url: link.url, target: link.target, description: link.description }} redirectKeywords={links.filter((item) => item.kind === 'redirect').map((item) => item.keyword)} onSubmit={handleSubmit} onCancel={() => navigate(returnTo)} /><div className="mt-8 pt-6 border-t border-[#dce3ea] dark:border-[#333d48]"><h2 className="font-semibold mb-2">Delete link</h2><p className="gl-subtitle text-sm mb-3">Deleting a group leaves its child links in place.</p><button type="button" onClick={handleDelete} className="gl-btn gl-btn-danger">Delete go/{keyword}</button>{deleteError && <p role="alert" className="text-red-700 dark:text-red-300 text-sm mt-2">{deleteError}</p>}</div></section>
}
