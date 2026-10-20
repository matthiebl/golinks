import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import LinkForm, { type LinkFormValues } from '../components/LinkForm'
import { useAuth } from '../hooks/useAuth'
import { useLinks } from '../hooks/useLinks'
import { createLink } from '../lib/links'

export default function NewLink() {
  const { isOwner, loading } = useAuth()
  const { links } = useLinks()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const keyword = params.get('keyword') ?? ''
  const kind = params.get('kind') === 'tree' ? 'tree' : 'redirect'
  const from = params.get('from')
  const returnTo = from?.startsWith('/') && !from.startsWith('//') ? from : '/-/all'

  async function handleCreate(values: LinkFormValues) {
    await createLink(values)
    navigate(returnTo, { state: { notice: `Created go/${values.keyword}` } })
  }

  if (loading) return <p className="gl-page gl-muted">Checking account…</p>
  if (!isOwner) return <div className="gl-page"><h1 className="gl-title">Sign in to create a link</h1><p className="gl-subtitle mt-3">Only the owner can add shortcuts.</p><Link to="/" className="gl-btn mt-6">Back to search</Link></div>

  return <div className="gl-page"><nav className="gl-breadcrumb" aria-label="Breadcrumb"><Link to="/-/all">Links</Link> / New link</nav><h1 className="gl-title">New link</h1><p className="gl-subtitle mt-2 mb-6">Make a short path you can remember.</p><LinkForm key={`${keyword}:${kind}`} mode="create" initial={{ keyword, kind }} existingKeywords={links.map((link) => link.keyword)} redirectKeywords={links.filter((link) => link.kind === 'redirect').map((link) => link.keyword)} onSubmit={handleCreate} onCancel={() => navigate(returnTo)} /></div>
}
