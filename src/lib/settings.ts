// Persisted user preference: when a keyword is visited directly as a path
// (e.g. go/nope) and no link matches, do we land on the create form or
// forward straight to Google? Only meaningful for the site-search-keyword
// entry point — the default-search-engine (?q=) entry point always falls
// back to Google on a miss, since that's the whole point of the fallback.

import type { MissMode } from './resolve'

const SETTINGS_KEY = 'golinks.settings.v1'

type Settings = { pathMiss: MissMode }

const DEFAULT_SETTINGS: Settings = { pathMiss: 'create' }

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    if (parsed.pathMiss !== 'create' && parsed.pathMiss !== 'google') {
      return DEFAULT_SETTINGS
    }
    return { pathMiss: parsed.pathMiss }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function setPathMiss(mode: MissMode): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ pathMiss: mode }))
  } catch {
    // Best-effort only.
  }
}
