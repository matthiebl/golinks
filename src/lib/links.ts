import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { requeueHits, takePendingHits, type PendingHits } from './pendingHits'

export type Link = {
  keyword: string
  kind: 'redirect' | 'tree' | 'alias'
  url: string
  target: string
  description: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
  hits: number
  lastUsedAt: Timestamp | null
}

const COLLECTION = 'links'

// Firestore document IDs can't contain "/", so a multi-segment keyword like
// "a/b/c" is stored as "a%2Fb%2Fc". Keyword validation below forbids "%" so
// this mapping is unambiguous and needs no escaping of "%" itself.
export function encodeKey(keyword: string): string {
  return keyword.split('/').join('%2F')
}

export function decodeKey(id: string): string {
  return id.split('%2F').join('/')
}

const KEYWORD_RE = /^[a-z0-9._-]+(\/[a-z0-9._-]+)*$/

export function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase()
}

export function validateKeyword(keyword: string): string | null {
  if (!keyword) return 'Keyword is required.'
  if (!KEYWORD_RE.test(keyword)) {
    return 'Use lowercase letters, numbers, ".", "_", "-", and "/" to nest (no leading, trailing, or double slashes).'
  }
  if (keyword.split('/')[0] === '-') {
    return 'Keywords starting with "-" are reserved for the app itself.'
  }
  return null
}

export function validateUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'URL must start with http:// or https://.'
    }
  } catch {
    return 'Enter a valid URL, e.g. https://example.com.'
  }
  return null
}

function linkFromSnapshot(id: string, data: Record<string, unknown>): Link {
  return {
    keyword: decodeKey(id),
    kind: data.kind === 'tree' || data.kind === 'alias' ? data.kind : 'redirect',
    url: (data.url as string) ?? '',
    target: (data.target as string) ?? '',
    description: (data.description as string) ?? '',
    createdAt: (data.createdAt as Timestamp) ?? null,
    updatedAt: (data.updatedAt as Timestamp) ?? null,
    hits: (data.hits as number) ?? 0,
    lastUsedAt: (data.lastUsedAt as Timestamp) ?? null,
  }
}

export async function getLink(keyword: string): Promise<Link | null> {
  const ref = doc(db, COLLECTION, encodeKey(keyword))
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return linkFromSnapshot(snap.id, snap.data())
}

export async function createLink(input: {
  keyword: string
  kind: 'redirect' | 'tree' | 'alias'
  url: string
  target?: string
  description?: string
}): Promise<void> {
  const keyword = normalizeKeyword(input.keyword)
  const keywordErr = validateKeyword(keyword)
  if (keywordErr) throw new Error(keywordErr)
  if (input.kind === 'redirect') {
    const urlErr = validateUrl(input.url)
    if (urlErr) throw new Error(urlErr)
  }
  const target = input.kind === 'alias' ? normalizeKeyword(input.target ?? '') : ''
  if (input.kind === 'alias') await validateAliasTarget(keyword, target)

  const ref = doc(db, COLLECTION, encodeKey(keyword))
  const existing = await getDoc(ref)
  if (existing.exists()) {
    throw new Error(`"${keyword}" already exists.`)
  }

  await setDoc(ref, {
    kind: input.kind,
    url: input.kind === 'redirect' ? input.url.trim() : '',
    target,
    description: input.description?.trim() ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    hits: 0,
    lastUsedAt: null,
  })
}

export async function updateLink(
  keyword: string,
  input: { kind: 'redirect' | 'tree' | 'alias'; url: string; target?: string; description?: string },
): Promise<void> {
  if (input.kind === 'redirect') {
    const urlErr = validateUrl(input.url)
    if (urlErr) throw new Error(urlErr)
  }
  const target = input.kind === 'alias' ? normalizeKeyword(input.target ?? '') : ''
  if (input.kind === 'alias') await validateAliasTarget(keyword, target)

  const ref = doc(db, COLLECTION, encodeKey(keyword))
  await setDoc(
    ref,
    {
      kind: input.kind,
      url: input.kind === 'redirect' ? input.url.trim() : '',
      target,
      description: input.description?.trim() ?? '',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

async function validateAliasTarget(keyword: string, target: string): Promise<void> {
  if (validateKeyword(target) || target === keyword) {
    throw new Error('Choose a different, existing redirect link as the alias target.')
  }
  const link = await getLink(target)
  if (link?.kind !== 'redirect') {
    throw new Error(`go/${target} is not an existing redirect link.`)
  }
}

export async function deleteLink(keyword: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, encodeKey(keyword)))
}

export async function fetchAllLinks(): Promise<Link[]> {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.docs.map((d) => linkFromSnapshot(d.id, d.data()))
}

// Writes hits queued by redirects (see pendingHits.ts). Called once when the
// app loads. Each hit is its own +1 write because firestore.rules only lets
// an unauthenticated visitor bump `hits` by exactly one.
export async function flushPendingHits(): Promise<void> {
  const pending = takePendingHits()
  const failed: PendingHits = {}

  for (const [keyword, { count, lastUsedAt }] of Object.entries(pending)) {
    const ref = doc(db, COLLECTION, encodeKey(keyword))
    let done = 0
    try {
      for (; done < count; done++) {
        await setDoc(
          ref,
          { hits: increment(1), lastUsedAt: Timestamp.fromMillis(lastUsedAt) },
          { merge: true },
        )
      }
    } catch (err) {
      // permission-denied means the link was deleted (the merge would be a
      // create, which only the owner may do) — drop those hits for good.
      if ((err as { code?: string }).code !== 'permission-denied') {
        failed[keyword] = { count: count - done, lastUsedAt }
      }
    }
  }

  if (Object.keys(failed).length > 0) requeueHits(failed)
}

export function subscribeLinks(
  callback: (links: Link[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      const links = snapshot.docs.map((d) => linkFromSnapshot(d.id, d.data()))
      callback(links)
    },
    (error) => {
      onError?.(error)
    },
  )
}
