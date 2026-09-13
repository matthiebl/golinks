import { useState } from 'react'
import AuthButton from '../components/AuthButton'
import { useAuth } from '../hooks/useAuth'
import type { MissMode } from '../lib/resolve'
import { getSettings, setPathMiss } from '../lib/settings'

export default function Settings() {
  const { isOwner } = useAuth()
  const [pathMiss, setPathMissState] = useState<MissMode>(() => getSettings().pathMiss)

  function handleChange(mode: MissMode) {
    setPathMiss(mode)
    setPathMissState(mode)
  }

  return (
    <div className="max-w-xl mx-auto space-y-10">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section>
        <h2 className="font-semibold mb-2">Account</h2>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <AuthButton />
          {!isOwner && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-600">
              Sign in with the owner's Google account to create, edit, or delete links.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">
          When <span className="font-mono">go/&lt;keyword&gt;</span> doesn't match anything
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Only applies when a keyword is visited directly (site-search mode). The
          default-search-engine mode (<span className="font-mono">?q=</span>) always falls back to
          Google on a miss.
        </p>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="pathMiss"
              checked={pathMiss === 'create'}
              onChange={() => handleChange('create')}
            />
            Show the "create this link" page
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="pathMiss"
              checked={pathMiss === 'google'}
              onChange={() => handleChange('google')}
            />
            Search Google instead
          </label>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Chrome setup</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-4">
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Default search engine</p>
            <p>Settings → Search engine → Manage search engines → Add:</p>
            <p className="font-mono text-xs bg-gray-100 dark:bg-gray-900 rounded px-2 py-1 mt-1 inline-block">
              https://go.mhiebl.com/?q=%s
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
              Site search keyword ("go" + Tab)
            </p>
            <p>Same page, add a second entry with keyword <span className="font-mono">go</span> and URL:</p>
            <p className="font-mono text-xs bg-gray-100 dark:bg-gray-900 rounded px-2 py-1 mt-1 inline-block">
              https://go.mhiebl.com/%s
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
