import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import LinkForm, { type LinkFormValues } from '../components/LinkForm'
import { useAuth } from '../hooks/useAuth'
import { deleteLink, getLink, updateLink, type Link } from '../lib/links'

export default function EditLink() {
  const params = useParams()
  const keyword = (params['*'] ?? '').toLowerCase()
  // Keyed by keyword so navigating between edit pages remounts this (fresh
  // `link`/`notFound` state) rather than needing to reset it in an effect.
  return <EditLinkForKeyword key={keyword} keyword={keyword} />
}

function EditLinkForKeyword({ keyword }: { keyword: string }) {
  const navigate = useNavigate()
  const { isOwner, loading: authLoading } = useAuth()
  const [link, setLink] = useState<Link | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    getLink(keyword).then((found) => {
      if (cancelled) return
      if (found) setLink(found)
      else setNotFound(true)
    })
    return () => {
      cancelled = true
    }
  }, [keyword])

  async function handleSubmit(values: LinkFormValues) {
    await updateLink(keyword, values)
    navigate('/')
  }

  async function handleDelete() {
    if (!window.confirm(`Delete go/${keyword}? This can't be undone.`)) return
    await deleteLink(keyword)
    navigate('/')
  }

  if (authLoading) return null

  if (!isOwner) {
    return (
      <section className="max-w-lg mx-auto text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          Sign in with the owner's Google account to edit links.
        </p>
      </section>
    )
  }

  if (notFound) {
    return (
      <section className="max-w-lg mx-auto text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No link found for <span className="font-mono">go/{keyword}</span>.
        </p>
      </section>
    )
  }

  if (!link) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-600 py-24">Loading…</div>
    )
  }

  return (
    <section className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 font-mono">go/{keyword}</h1>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <LinkForm
          mode="edit"
          initial={{ keyword: link.keyword, url: link.url, description: link.description }}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/')}
        />
      </div>
      <button
        onClick={handleDelete}
        className="mt-4 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400"
      >
        Delete this link
      </button>
    </section>
  )
}
