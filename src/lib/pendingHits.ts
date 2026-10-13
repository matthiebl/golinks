// Hit counts recorded at redirect time, queued in localStorage and written
// to Firestore later (see flushPendingHits in links.ts). This keeps Firebase
// off the redirect path entirely, and unlike a fire-and-forget write it
// isn't lost when the page navigates away mid-request.

const PENDING_KEY = 'golinks.pendingHits.v1'

export type PendingHits = Record<string, { count: number; lastUsedAt: number }>

function read(): PendingHits {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    const parsed = raw ? (JSON.parse(raw) as PendingHits) : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function write(hits: PendingHits): void {
  try {
    if (Object.keys(hits).length === 0) localStorage.removeItem(PENDING_KEY)
    else localStorage.setItem(PENDING_KEY, JSON.stringify(hits))
  } catch {
    // Best-effort only.
  }
}

export function queueHit(keyword: string): void {
  const hits = read()
  const prev = hits[keyword]
  hits[keyword] = { count: (prev?.count ?? 0) + 1, lastUsedAt: Date.now() }
  write(hits)
}

/** Remove and return everything queued, so concurrent tabs don't double-flush. */
export function takePendingHits(): PendingHits {
  const hits = read()
  write({})
  return hits
}

/** Put back hits that failed to flush, merging with anything queued since. */
export function requeueHits(failed: PendingHits): void {
  const hits = read()
  for (const [keyword, entry] of Object.entries(failed)) {
    const prev = hits[keyword]
    hits[keyword] = {
      count: (prev?.count ?? 0) + entry.count,
      lastUsedAt: Math.max(prev?.lastUsedAt ?? 0, entry.lastUsedAt),
    }
  }
  write(hits)
}
