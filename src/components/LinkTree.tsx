import { Link as RouterLink } from 'react-router-dom'
import type { Link } from '../lib/links'
import { linkHref } from '../lib/linkHref'
import { queueHit } from '../lib/pendingHits'

type TreeNode = { segment: string; path: string; link?: Link; children: Map<string, TreeNode> }

function buildTree(links: Link[], rootKeyword: string): TreeNode {
  const root: TreeNode = { segment: rootKeyword.split('/').at(-1) ?? '', path: rootKeyword, children: new Map() }
  const prefix = rootKeyword ? `${rootKeyword}/` : ''
  for (const link of links) {
    if (rootKeyword && !link.keyword.startsWith(prefix)) continue
    const suffix = rootKeyword ? link.keyword.slice(prefix.length) : link.keyword
    let node = root
    let path = rootKeyword
    for (const segment of suffix.split('/')) {
      path = path ? `${path}/${segment}` : segment
      let child = node.children.get(segment)
      if (!child) { child = { segment, path, children: new Map() }; node.children.set(segment, child) }
      node = child
    }
    node.link = link
  }
  return root
}

function countRedirects(node: TreeNode): number {
  return (node.link?.kind === 'redirect' ? 1 : 0) + [...node.children.values()].reduce((total, child) => total + countRedirects(child), 0)
}

function domain(url: string) {
  try { return new URL(url).hostname } catch { return url }
}

function Node({ node, isOwner, isLast, ancestorContinues, isRoot = false }: {
  node: TreeNode
  isOwner: boolean
  isLast: boolean
  ancestorContinues: boolean[]
  isRoot?: boolean
}) {
  const children = [...node.children.values()].sort((a, b) => a.segment.localeCompare(b.segment))
  const hasChildren = children.length > 0
  const isGroup = node.link?.kind === 'tree' || !node.link
  const count = isGroup ? countRedirects(node) : 0
  const countLabel = `${count} ${count === 1 ? 'link' : 'links'}`
  const label = isGroup ? node.link?.description || 'Group of links' : [domain(node.link?.url ?? ''), node.link?.description].filter(Boolean).join(' · ')
  const destination = isGroup ? '' : domain(node.link!.url)

  return (
    <div>
      <div className="gl-tree-row">
        {!isRoot && <span className="gl-tree-prefix" aria-hidden="true">
          {ancestorContinues.map((continues, index) => <span key={index} className={`gl-tree-rail ${continues ? 'gl-tree-rail-continued' : ''}`} />)}
          <span className={`gl-tree-elbow ${isLast ? 'gl-tree-elbow-last' : ''}`} />
        </span>}
        <div className={`gl-tree-content${hasChildren ? ' gl-tree-parent' : ''}`}>
          <a href={node.link ? linkHref(node.link) : `/${node.path}`} onClick={() => { if (!isGroup) queueHit(node.path) }} aria-label={`Open go/${node.path}${destination ? `, ${destination}` : ', group'}`} className="gl-tree-link">
            <span className="gl-tree-glyph" aria-hidden="true">{isGroup ? '▣' : '↗'}</span>
            <span className="gl-tree-main"><span className="gl-tree-name">{node.segment}</span><span className="gl-tree-detail">{label}</span></span>
            {isGroup && <span className="gl-tree-count">{countLabel}</span>}
            <span className="gl-tree-arrow" aria-hidden="true">{isGroup ? '›' : '↗'}</span>
          </a>
          {isOwner && node.link && <RouterLink to={`/-/edit/${node.path}?from=${encodeURIComponent(window.location.pathname)}`} className="gl-text-link text-xs px-2 py-2 shrink-0">Edit</RouterLink>}
          {isOwner && isGroup && !node.link && <RouterLink to={`/-/new?keyword=${encodeURIComponent(node.path)}&kind=tree&from=${encodeURIComponent(window.location.pathname)}`} className="gl-text-link text-xs px-2 py-2 shrink-0">Describe</RouterLink>}
        </div>
      </div>
      {hasChildren && <div>
        {children.map((child, index) => <Node
          key={child.path}
          node={child}
          isOwner={isOwner}
          isLast={index === children.length - 1}
          ancestorContinues={isRoot ? [] : [...ancestorContinues, !isLast]}
        />)}
      </div>}
    </div>
  )
}

export default function LinkTree({ links, isOwner, rootKeyword = '' }: { links: Link[]; isOwner: boolean; rootKeyword?: string }) {
  const root = buildTree(links, rootKeyword)
  const children = [...root.children.values()].sort((a, b) => a.segment.localeCompare(b.segment))
  if (!children.length) return <div className="gl-card p-7 text-center text-sm gl-muted">{rootKeyword ? 'This group is empty.' : 'No links yet.'}</div>
  return <div className="gl-card gl-tree" aria-label={rootKeyword ? `All descendants of go/${rootKeyword}` : 'All links as a tree'}>{children.map((node, index) => <Node key={node.path} node={node} isOwner={isOwner} isLast={index === children.length - 1} ancestorContinues={[]} isRoot />)}</div>
}
