import { describe, expect, it } from 'vitest'
import {
  buildDestinationUrl,
  googleSearchUrl,
  resolvePath,
  resolveQuery,
  type Lookup,
  type ResolvableLink,
} from './resolve'
import { buildLookupMap, type CachedLink } from './cache'

const LINKS: Record<string, ResolvableLink> = {
  gh: { keyword: 'gh', url: 'https://github.com' },
  'a/b': { keyword: 'a/b', url: 'https://example.com/ab' },
  'a/b/c': { keyword: 'a/b/c', url: 'https://example.com/abc' },
  gs: { keyword: 'gs', url: 'https://google.com/search?q={*}' },
  pct: { keyword: 'pct', url: 'https://example.com/search?q=%s' },
}

const lookup: Lookup = (key) => LINKS[key]

describe('buildDestinationUrl', () => {
  it('returns the url unchanged with no remainder', () => {
    expect(buildDestinationUrl('https://example.com', '')).toBe('https://example.com')
  })

  it('appends a path remainder', () => {
    expect(buildDestinationUrl('https://example.com/abc', 'extra')).toBe(
      'https://example.com/abc/extra',
    )
  })

  it('appends a multi-segment path remainder, encoding each segment', () => {
    expect(buildDestinationUrl('https://example.com/abc', 'x y/z')).toBe(
      'https://example.com/abc/x%20y/z',
    )
  })

  it('substitutes {*} placeholders', () => {
    expect(buildDestinationUrl('https://x.com/search?q={*}', 'hello world')).toBe(
      'https://x.com/search?q=hello%20world',
    )
  })

  it('substitutes %s placeholders', () => {
    expect(buildDestinationUrl('https://x.com/search?q=%s', 'hello world')).toBe(
      'https://x.com/search?q=hello%20world',
    )
  })
})

describe('resolvePath', () => {
  it('resolves an exact match', () => {
    const result = resolvePath('/gh', lookup)
    expect(result).toEqual({
      type: 'redirect',
      url: 'https://github.com',
      matchedKeyword: 'gh',
    })
  })

  it('resolves an exact multi-segment match', () => {
    const result = resolvePath('/a/b/c', lookup)
    expect(result).toEqual({
      type: 'redirect',
      url: 'https://example.com/abc',
      matchedKeyword: 'a/b/c',
    })
  })

  it('falls back to the longest matching prefix, carrying the remainder', () => {
    const result = resolvePath('/a/b/c/extra/stuff', lookup)
    expect(result).toEqual({
      type: 'redirect',
      url: 'https://example.com/abc/extra/stuff',
      matchedKeyword: 'a/b/c',
    })
  })

  it('falls back further when only a shorter prefix matches', () => {
    const result = resolvePath('/a/b/nope', lookup)
    expect(result).toEqual({
      type: 'redirect',
      url: 'https://example.com/ab/nope',
      matchedKeyword: 'a/b',
    })
  })

  it('substitutes a placeholder using the remainder', () => {
    const result = resolvePath('/gs/hello world', lookup)
    expect(result).toEqual({
      type: 'redirect',
      url: 'https://google.com/search?q=hello%20world',
      matchedKeyword: 'gs',
    })
  })

  it('is case-insensitive on the keyword', () => {
    const result = resolvePath('/GH', lookup)
    expect(result).toEqual({
      type: 'redirect',
      url: 'https://github.com',
      matchedKeyword: 'gh',
    })
  })

  it('treats "/" as the home page, not a miss', () => {
    expect(resolvePath('/', lookup)).toEqual({ type: 'home' })
    expect(resolvePath('', lookup)).toEqual({ type: 'home' })
  })

  it('defaults a miss to the create form', () => {
    expect(resolvePath('/nope', lookup)).toEqual({ type: 'create', keyword: 'nope' })
  })

  it('sends a miss to google when missMode is "google"', () => {
    expect(resolvePath('/nope/at/all', lookup, 'google')).toEqual({
      type: 'google',
      query: 'nope at all',
    })
  })
})

describe('resolveQuery', () => {
  it('resolves the first token as the keyword and the rest as the remainder', () => {
    const result = resolveQuery('gs hello world', lookup)
    expect(result).toEqual({
      type: 'redirect',
      url: 'https://google.com/search?q=hello%20world',
      matchedKeyword: 'gs',
    })
  })

  it('resolves an exact match with no trailing words', () => {
    expect(resolveQuery('gh', lookup)).toEqual({
      type: 'redirect',
      url: 'https://github.com',
      matchedKeyword: 'gh',
    })
  })

  it('always forwards a miss to google', () => {
    expect(resolveQuery('some random search terms', lookup)).toEqual({
      type: 'google',
      query: 'some random search terms',
    })
  })

  it('treats blank input as home', () => {
    expect(resolveQuery('   ', lookup)).toEqual({ type: 'home' })
  })
})

describe('googleSearchUrl', () => {
  it('encodes the query', () => {
    expect(googleSearchUrl('a b c')).toBe('https://www.google.com/search?q=a%20b%20c')
  })
})

describe('tree links', () => {
  const treeLinks: CachedLink[] = [
    { keyword: 'stream/disney', kind: 'redirect', url: 'https://disney.com', description: '', hits: 0 },
    { keyword: 'stream/netflix', kind: 'redirect', url: 'https://netflix.com', description: '', hits: 0 },
    { keyword: 'stream/music/spotify', kind: 'redirect', url: 'https://spotify.com', description: '', hits: 0 },
    { keyword: 'other', kind: 'redirect', url: 'https://other.com', description: '', hits: 0 },
  ]

  it('derives parent trees and opens nested trees', () => {
    const map = buildLookupMap(treeLinks)
    const lookup: Lookup = (key) => map.get(key)
    expect(resolvePath('/stream', lookup)).toEqual({ type: 'tree', keyword: 'stream' })
    expect(resolvePath('/stream/music', lookup)).toEqual({ type: 'tree', keyword: 'stream/music' })
    expect(resolveQuery('stream', lookup)).toEqual({ type: 'tree', keyword: 'stream' })
    expect(resolveQuery('stream music', lookup)).toEqual({ type: 'google', query: 'stream music' })
    expect(resolvePath('/stream/music/spotify', lookup)).toEqual({
      type: 'redirect', url: 'https://spotify.com', matchedKeyword: 'stream/music/spotify',
    })
  })

  it('allows an explicit empty tree', () => {
    const map = buildLookupMap([{ keyword: 'empty', kind: 'tree', url: '', description: 'Empty tree', hits: 0 }])
    expect(resolvePath('/empty', (key) => map.get(key))).toEqual({ type: 'tree', keyword: 'empty' })
  })

  it('keeps an existing redirect at a parent and stops fallback at a tree', () => {
    const map = buildLookupMap([
      ...treeLinks,
      { keyword: 'stream', kind: 'redirect', url: 'https://stream.example', description: '', hits: 0 },
      { keyword: 'stream/music', kind: 'tree', url: '', description: '', hits: 0 },
    ])
    const lookup: Lookup = (key) => map.get(key)
    expect(resolvePath('/stream', lookup)).toEqual({
      type: 'redirect', url: 'https://stream.example', matchedKeyword: 'stream',
    })
    expect(resolvePath('/stream/music/unknown', lookup)).toEqual({
      type: 'create', keyword: 'stream/music/unknown',
    })
    expect(resolvePath('/stream/music/unknown', lookup, 'google')).toEqual({
      type: 'google', query: 'stream music unknown',
    })
  })
})

describe('aliases', () => {
  const links: CachedLink[] = [
    { keyword: 'youtube', kind: 'redirect', url: 'https://youtube.com/{*}', description: '', hits: 0 },
    { keyword: 'yt', kind: 'alias', url: '', target: 'youtube', description: '', hits: 0 },
    { keyword: 'stream/disney', kind: 'alias', url: '', target: 'disney', description: '', hits: 0 },
  ]
  const lookup: Lookup = (key) => buildLookupMap(links).get(key)

  it('uses the target URL and attributes hits to the alias', () => {
    expect(resolvePath('/yt/cats', lookup)).toEqual({ type: 'redirect', url: 'https://youtube.com/cats', matchedKeyword: 'yt' })
    expect(resolveQuery('yt funny cats', lookup)).toEqual({ type: 'redirect', url: 'https://youtube.com/funny%20cats', matchedKeyword: 'yt' })
  })

  it('reports a deleted or invalid target', () => {
    expect(resolvePath('/stream/disney', lookup)).toEqual({ type: 'broken-alias', keyword: 'stream/disney', target: 'disney' })
    const targetIsAlias: Lookup = (key) => key === 'youtube' ? links[1] : lookup(key)
    expect(resolvePath('/yt', targetIsAlias)).toEqual({ type: 'broken-alias', keyword: 'yt', target: 'youtube' })
  })

  it('follows updates to the target URL', () => {
    const updated: Lookup = (key) => key === 'youtube'
      ? { keyword: 'youtube', kind: 'redirect', url: 'https://new.example/%s' }
      : lookup(key)
    expect(resolvePath('/yt/cats', updated)).toEqual({ type: 'redirect', url: 'https://new.example/cats', matchedKeyword: 'yt' })
  })
})
