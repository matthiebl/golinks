import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export type Link = {
  keyword: string
  url: string
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
    url: (data.url as string) ?? '',
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
  url: string
  description?: string
}): Promise<void> {
  const keyword = normalizeKeyword(input.keyword)
  const keywordErr = validateKeyword(keyword)
  if (keywordErr) throw new Error(keywordErr)
  const urlErr = validateUrl(input.url)
  if (urlErr) throw new Error(urlErr)

  const ref = doc(db, COLLECTION, encodeKey(keyword))
  const existing = await getDoc(ref)
  if (existing.exists()) {
    throw new Error(`"${keyword}" already exists.`)
  }

  await setDoc(ref, {
    url: input.url.trim(),
    description: input.description?.trim() ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    hits: 0,
    lastUsedAt: null,
  })
}

export async function updateLink(
  keyword: string,
  input: { url: string; description?: string },
): Promise<void> {
  const urlErr = validateUrl(input.url)
  if (urlErr) throw new Error(urlErr)

  const ref = doc(db, COLLECTION, encodeKey(keyword))
  await setDoc(
    ref,
    {
      url: input.url.trim(),
      description: input.description?.trim() ?? '',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function deleteLink(keyword: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, encodeKey(keyword)))
}

// Fire-and-forget usage tracking. Never awaited by callers on the redirect
// path — a failure here must never delay or block a redirect.
export function bumpHit(keyword: string): void {
  const ref = doc(db, COLLECTION, encodeKey(keyword))
  setDoc(
    ref,
    { hits: increment(1), lastUsedAt: serverTimestamp() },
    { merge: true },
  ).catch(() => {
    // Best-effort only.
  })
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
