import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { performRedirect, resolveAndConfirm } from '../lib/redirectFlow'
import { googleSearchUrl, type Destination } from '../lib/resolve'

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

  if (destination.type !== 'create') {
    // 'home': nothing to show. 'redirect'/'google' are handled by
    // performRedirect above and never reach state, but TS can't see that.
    return null
  }

  // destination.type === 'create' — nothing matched, offer to add it.
  return (
    <section className="max-w-lg mx-auto text-center py-12">
      <p className="text-sm text-gray-400 dark:text-gray-600 mb-2">No link found for</p>
      <h1 className="font-mono text-2xl font-semibold mb-8">go/{destination.keyword}</h1>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to={`/?new=${encodeURIComponent(destination.keyword)}`}
          className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
        >
          Create this link
        </Link>
        <a
          href={googleSearchUrl(destination.keyword.split('/').join(' '))}
          className="border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Search Google instead
        </a>
      </div>
    </section>
  )
}
