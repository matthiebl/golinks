import { useState, type FormEvent } from 'react'
import { queueHit } from '../lib/pendingHits'
import { googleSearchUrl, resolveQuery, type Lookup } from '../lib/resolve'
import type { Link } from '../lib/links'

type SearchBarProps = {
  links: Link[]
  lookup: Lookup
}

function go(url: string, keyword: string) {
  queueHit(keyword)
  window.location.href = url
}

export default function SearchBar({ links, lookup }: SearchBarProps) {
  const [query, setQuery] = useState('')

  const trimmed = query.trim().toLowerCase()
  const suggestions = trimmed
    ? links
        .filter(
          (l) => l.keyword.includes(trimmed) || l.description.toLowerCase().includes(trimmed),
        )
        .slice(0, 8)
    : []

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    const dest = resolveQuery(query, lookup)
    if (dest.type === 'redirect') {
      go(dest.url, dest.matchedKeyword)
    } else if (dest.type === 'google') {
      window.location.href = googleSearchUrl(dest.query)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search links, or type a keyword and hit enter…"
        autoFocus
        className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1.5 w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
          {suggestions.map((l) => (
            <li key={l.keyword}>
              <button
                type="button"
                onClick={() => go(l.url, l.keyword)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm flex items-center justify-between gap-4"
              >
                <span className="font-mono shrink-0">go/{l.keyword}</span>
                {l.description && (
                  <span className="text-gray-400 dark:text-gray-600 truncate">{l.description}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
