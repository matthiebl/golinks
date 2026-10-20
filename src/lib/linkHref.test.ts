import { describe, expect, it } from 'vitest'
import { linkHref } from './linkHref'

describe('linkHref', () => {
  it('opens redirect destinations directly, including placeholder URLs', () => {
    expect(linkHref({ keyword: 'docs', kind: 'redirect', url: 'https://example.com/docs' })).toBe('https://example.com/docs')
    expect(linkHref({ keyword: 'search', kind: 'redirect', url: 'https://example.com?q=%s' })).toBe('https://example.com?q=')
  })

  it('opens groups at their tree page', () => {
    expect(linkHref({ keyword: 'work/docs', kind: 'tree', url: '' })).toBe('/work/docs')
  })

  it('opens aliases through their own go path', () => {
    expect(linkHref({ keyword: 'yt', kind: 'alias', url: '', target: 'youtube' })).toBe('/yt')
  })
})
