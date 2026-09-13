import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import LinkForm, { type LinkFormValues } from '../components/LinkForm'
import LinkTree from '../components/LinkTree'
import SearchBar from '../components/SearchBar'
import { useAuth } from '../hooks/useAuth'
import { useLinks } from '../hooks/useLinks'
import { performRedirect, resolveAndConfirm } from '../lib/redirectFlow'
import { createLink } from '../lib/links'
import type { Lookup } from '../lib/resolve'

export default function Home() {
  const { isOwner } = useAuth()
  const { links, loading, error, lookupMap } = useLinks()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCreate, setShowCreate] = useState(false)

  const queryParam = searchParams.get('q')
  const prefillKeyword = searchParams.get('new') ?? ''

  // Default-search-engine mode: go.mhiebl.com/?q=%s. A hit redirects away
  // immediately; a miss forwards to Google. Neither outcome renders here.
  useEffect(() => {
    if (!queryParam) return
    let cancelled = false
    resolveAndConfirm('query', queryParam).then((dest) => {
      if (!cancelled) performRedirect(dest)
    })
    return () => {
      cancelled = true
    }
  }, [queryParam])

  const lookup: Lookup = (key) => lookupMap.get(key)

  function clearParam(name: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete(name)
      return next
    })
  }

  async function handleCreate(values: LinkFormValues) {
    await createLink(values)
    setShowCreate(false)
    clearParam('new')
  }

  const creating = showCreate || Boolean(prefillKeyword)

  if (queryParam) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-600 py-24">
        Searching for <span className="font-mono">{queryParam}</span>…
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <section>
        <h1 className="text-3xl font-bold text-center mb-6 font-mono">go/</h1>
        <SearchBar links={links} lookup={lookup} />
      </section>

      {isOwner && (
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          {creating ? (
            <>
              <h2 className="font-semibold mb-4">New link</h2>
              <LinkForm
                mode="create"
                initial={{ keyword: prefillKeyword }}
                onSubmit={handleCreate}
                onCancel={() => {
                  setShowCreate(false)
                  clearParam('new')
                }}
              />
            </>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              + New link
            </button>
          )}
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">All links</h2>
          {links.length > 0 && (
            <Link
              to="/-/all"
              className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-900 dark:hover:text-gray-100"
            >
              View as list
            </Link>
          )}
        </div>
        {error ? (
          <p className="text-sm text-red-500 dark:text-red-400 text-center py-8">
            Couldn't load links: {error.message}
          </p>
        ) : loading ? (
          <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">Loading…</p>
        ) : (
          <LinkTree links={links} isOwner={isOwner} />
        )}
      </section>
    </div>
  )
}
