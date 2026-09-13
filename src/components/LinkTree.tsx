import { Link as RouterLink } from 'react-router-dom'
import type { Link } from '../lib/links'
import { deleteLink } from '../lib/links'

type TreeNode = {
  segment: string
  path: string
  link?: Link
  children: Map<string, TreeNode>
}

function buildTree(links: Link[]): TreeNode {
  const root: TreeNode = { segment: '', path: '', children: new Map() }
  for (const link of links) {
    const segments = link.keyword.split('/')
    let node = root
    let path = ''
    for (const segment of segments) {
      path = path ? `${path}/${segment}` : segment
      let next = node.children.get(segment)
      if (!next) {
        next = { segment, path, children: new Map() }
        node.children.set(segment, next)
      }
      node = next
    }
    node.link = link
  }
  return root
}

function sortedChildren(node: TreeNode): TreeNode[] {
  return Array.from(node.children.values()).sort((a, b) => a.segment.localeCompare(b.segment))
}

function FolderIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4 text-gray-400 dark:text-gray-600 shrink-0"
    >
      <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h4.379a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 12.12 6H19.5A1.5 1.5 0 0 1 21 7.5v11A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5v-13Z" />
    </svg>
  )
}

function LinkRow({ link, isOwner }: { link: Link; isOwner: boolean }) {
  async function handleDelete() {
    if (!window.confirm(`Delete go/${link.keyword}? This can't be undone.`)) return
    try {
      await deleteLink(link.keyword)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete link.')
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900 group/row">
      <div className="min-w-0 flex items-baseline gap-2">
        <a
          href={`/${link.keyword}`}
          className="font-mono text-sm text-gray-900 dark:text-gray-100 hover:underline shrink-0"
        >
          go/{link.keyword}
        </a>
        {link.description && (
          <span className="text-xs text-gray-400 dark:text-gray-600 truncate">
            {link.description}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-gray-300 dark:text-gray-700 tabular-nums">
          {link.hits} {link.hits === 1 ? 'hit' : 'hits'}
        </span>
        {isOwner && (
          <span className="flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <RouterLink
              to={`/-/edit/${link.keyword}`}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Edit
            </RouterLink>
            <button
              onClick={handleDelete}
              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
            >
              Delete
            </button>
          </span>
        )}
      </div>
    </div>
  )
}

function Node({ node, isOwner }: { node: TreeNode; isOwner: boolean }) {
  const children = sortedChildren(node)

  if (children.length === 0) {
    // Built only from real links, so a leaf always carries one.
    return <LinkRow link={node.link!} isOwner={isOwner} />
  }

  return (
    <details className="group" open>
      <summary className="cursor-pointer select-none list-none flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-3 h-3 text-gray-400 dark:text-gray-600 transition-transform group-open:rotate-90 shrink-0"
        >
          <path d="M9 6l6 6-6 6V6z" />
        </svg>
        <FolderIcon />
        <span className="font-mono text-sm">{node.segment}</span>
      </summary>
      <div className="ml-5 border-l border-gray-200 dark:border-gray-800 pl-3">
        {node.link && <LinkRow link={node.link} isOwner={isOwner} />}
        {children.map((child) => (
          <Node key={child.path} node={child} isOwner={isOwner} />
        ))}
      </div>
    </details>
  )
}

export default function LinkTree({ links, isOwner }: { links: Link[]; isOwner: boolean }) {
  if (links.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">
        No links yet — create your first one above.
      </p>
    )
  }

  const root = buildTree(links)
  const topLevel = sortedChildren(root)

  return (
    <div className="space-y-0.5">
      {topLevel.map((node) => (
        <Node key={node.path} node={node} isOwner={isOwner} />
      ))}
    </div>
  )
}
