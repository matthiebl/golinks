import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import LinkTree from './LinkTree'
import type { Link } from '../lib/links'

function redirect(keyword: string): Link {
  return { keyword, kind: 'redirect', url: 'https://example.com', description: '', createdAt: null, updatedAt: null, lastUsedAt: null, hits: 0 }
}

describe('nested tree view', () => {
  it('shows every descendant under a tree page without requiring another navigation', () => {
    const html = renderToStaticMarkup(<LinkTree rootKeyword="stream" links={[
      redirect('stream/disney'),
      redirect('stream/music/playlists/focus'),
      redirect('stream/music/playlists/workout'),
    ]} isOwner={false} />)

    expect(html).toContain('Open go/stream/disney')
    expect(html).toContain('Open go/stream/music, group')
    expect(html).toContain('Open go/stream/music/playlists, group')
    expect(html).toContain('Open go/stream/music/playlists/focus')
    expect(html).toContain('Open go/stream/music/playlists/workout')
    expect(html).toContain('href="/stream/music"')
    expect(html).toContain('href="https://example.com"')
    expect(html).not.toContain('aria-expanded')
    expect(html).not.toContain(' hidden=')
  })

  it('keeps a redirect parent and its child independently reachable', () => {
    const html = renderToStaticMarkup(<LinkTree rootKeyword="" links={[
      redirect('work'), redirect('work/docs'),
    ]} isOwner={false} />)
    expect(html.match(/href="https:\/\/example.com"/g)).toHaveLength(2)
    expect(html).toContain('Open go/work')
    expect(html).toContain('Open go/work/docs')
    expect(html).not.toContain('<button')
  })
})
