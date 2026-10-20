import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { buildLookupMap } from '../lib/cache'
import type { Link } from '../lib/links'
import { queueHit } from '../lib/pendingHits'
import { buildDestinationUrl, googleSearchUrl, resolveQuery, type Lookup } from '../lib/resolve'

type Props = { links: Link[]; lookup: Lookup }

type Option =
  | { type: 'link'; keyword: string; kind: 'redirect' | 'tree'; url: string; description: string }
  | { type: 'create'; keyword: string }
  | { type: 'google'; query: string }

function openLink(option: Extract<Option, { type: 'link' }>) {
  if (option.kind === 'tree') {
    window.location.assign(`/${option.keyword}`)
  } else {
    queueHit(option.keyword)
    window.location.assign(buildDestinationUrl(option.url, ''))
  }
}

export default function SearchBar({ links, lookup }: Props) {
  const navigate = useNavigate()
  const { isOwner, signIn } = useAuth()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const [closed, setClosed] = useState(false)
  const name = query.trim().replace(/^go\//i, '')
  const term = name.toLowerCase()
  const searchable = useMemo(() => [...buildLookupMap(links).values()], [links])
  const exact = Boolean(term && searchable.some((link) => link.keyword === term))
  const matches = term
    ? searchable.filter((link) =>
        link.keyword.includes(term) ||
        link.description.toLowerCase().includes(term) ||
        link.url.toLowerCase().includes(term),
      ).slice(0, 6)
    : []
  const options: Option[] = term
    ? [
        ...matches.map((link): Option => ({ type: 'link', ...link })),
        ...(!exact ? [{ type: 'create' as const, keyword: name }] : []),
        { type: 'google', query: query.trim() },
      ]
    : []

  function activate(option: Option) {
    if (option.type === 'link') return openLink(option)
    if (option.type === 'google') {
      window.location.assign(googleSearchUrl(option.query))
      return
    }
    if (isOwner) navigate(`/-/new?keyword=${encodeURIComponent(option.keyword)}`)
    else void signIn().then(() => navigate(`/-/new?keyword=${encodeURIComponent(option.keyword)}`)).catch(() => {})
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    if (active >= 0 && options[active]) return activate(options[active])
    const dest = resolveQuery(query, lookup)
    if (dest.type === 'redirect') {
      queueHit(dest.matchedKeyword)
      window.location.assign(dest.url)
    } else if (dest.type === 'tree') {
      window.location.assign(`/${dest.keyword}`)
    } else if (dest.type === 'google') {
      window.location.assign(googleSearchUrl(dest.query))
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') { setClosed(true); setActive(-1) }
    if (!options.length) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setClosed(false); setActive((n) => (n + 1) % options.length) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setClosed(false); setActive((n) => (n <= 0 ? options.length - 1 : n - 1)) }
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="relative">
      <div className="gl-card flex items-center gap-3 p-2 pl-4 border-[1.5px] border-[#245fa8] dark:border-[#80b8ff] shadow-sm">
        <span aria-hidden="true" className="text-xl gl-muted">⌕</span>
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(-1); setClosed(false) }}
          onFocus={() => setClosed(false)}
          onKeyDown={handleKeyDown}
          placeholder="Try gh, stream/music, or a description"
          aria-label="Search links"
          aria-expanded={Boolean(term && !closed)}
          aria-controls="search-options"
          autoFocus
          className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-[#718092]"
        />
        <span className="hidden sm:inline text-xs gl-muted border rounded px-2 py-1 border-[#dce3ea] dark:border-[#485563]">↵ open</span>
      </div>
      {term && !closed && (
        <div id="search-options" className="gl-card absolute z-20 mt-2 w-full overflow-hidden shadow-xl" role="listbox" aria-label="Search suggestions">
          {matches.length === 0 && <p className="px-4 py-3 text-sm gl-muted">No saved link found.</p>}
          {options.map((option, index) => (
            <button
              key={option.type === 'link' ? option.keyword : option.type}
              type="button"
              role="option"
              aria-selected={active === index}
              onMouseEnter={() => setActive(index)}
              onClick={() => activate(option)}
              className={`gl-row w-full text-left text-sm ${active === index ? 'bg-[#edf4fc] dark:bg-[#20344a]' : ''}`}
            >
              {option.type === 'link' ? (
                <>
                  <span className="min-w-0 flex-1"><span className="block font-mono font-semibold">go/{option.keyword}</span><span className="block truncate text-xs gl-muted mt-1">{option.description || (option.kind === 'tree' ? 'Group of links' : option.url)}</span></span>
                  {option.kind === 'tree' && <span className="gl-pill">GROUP</span>}
                  <span className="gl-muted">{option.kind === 'tree' ? '›' : '↗'}</span>
                </>
              ) : option.type === 'create' ? (
                <><span className="min-w-0 flex-1"><span className="block font-semibold">+ Create <span className="font-mono">go/{option.keyword}</span></span><span className="block text-xs gl-muted mt-1">{isOwner ? 'Start a new link with this name' : 'Sign in to create this link'}</span></span><span className="gl-muted">›</span></>
              ) : (
                <><span className="flex-1">Search Google for “{option.query}”</span><span className="gl-muted">↗</span></>
              )}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}
