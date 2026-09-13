import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLinks } from '../hooks/useLinks'
import { deleteLink } from '../lib/links'

type SortKey = 'keyword' | 'hits' | 'updatedAt'

export default function AllLinks() {
  const { isOwner } = useAuth()
  const { links, loading } = useLinks()
  const [sortKey, setSortKey] = useState<SortKey>('keyword')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'keyword' ? 'asc' : 'desc')
    }
  }

  const sorted = useMemo(() => {
    const copy = [...links]
    copy.sort((a, b) => {
      const cmp =
        sortKey === 'keyword'
          ? a.keyword.localeCompare(b.keyword)
          : sortKey === 'hits'
            ? a.hits - b.hits
            : (a.updatedAt?.toMillis() ?? 0) - (b.updatedAt?.toMillis() ?? 0)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [links, sortKey, sortDir])

  async function handleDelete(keyword: string) {
    if (!window.confirm(`Delete go/${keyword}? This can't be undone.`)) return
    try {
      await deleteLink(keyword)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete link.')
    }
  }

  if (loading) {
    return <div className="text-center text-gray-400 dark:text-gray-600 py-24">Loading…</div>
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        All links <span className="text-gray-400 dark:text-gray-600 font-normal text-base">({links.length})</span>
      </h1>
      {links.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">No links yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 dark:text-gray-600 border-b border-gray-200 dark:border-gray-800">
                <th className="py-2 pr-4 cursor-pointer font-medium" onClick={() => toggleSort('keyword')}>
                  Keyword
                </th>
                <th className="py-2 pr-4 font-medium">Description</th>
                <th className="py-2 pr-4 cursor-pointer font-medium" onClick={() => toggleSort('hits')}>
                  Hits
                </th>
                <th className="py-2 pr-4 cursor-pointer font-medium" onClick={() => toggleSort('updatedAt')}>
                  Updated
                </th>
                {isOwner && <th className="py-2" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((link) => (
                <tr key={link.keyword} className="border-b border-gray-100 dark:border-gray-900">
                  <td className="py-2 pr-4">
                    <a href={`/${link.keyword}`} className="font-mono hover:underline">
                      go/{link.keyword}
                    </a>
                  </td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 truncate max-w-xs">
                    {link.description}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{link.hits}</td>
                  <td className="py-2 pr-4 text-gray-400 dark:text-gray-600">
                    {link.updatedAt ? link.updatedAt.toDate().toLocaleDateString() : '—'}
                  </td>
                  {isOwner && (
                    <td className="py-2 text-right whitespace-nowrap">
                      <RouterLink
                        to={`/-/edit/${link.keyword}`}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mr-3"
                      >
                        Edit
                      </RouterLink>
                      <button
                        onClick={() => handleDelete(link.keyword)}
                        className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
