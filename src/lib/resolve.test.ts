import { describe, expect, it } from 'vitest'
import {
  buildDestinationUrl,
  googleSearchUrl,
  resolvePath,
  resolveQuery,
  type Lookup,
  type ResolvableLink,
} from './resolve'

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
