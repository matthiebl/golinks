import { useState, type FormEvent } from 'react'
import { normalizeKeyword, validateKeyword, validateUrl } from '../lib/links'

export type LinkFormValues = { keyword: string; kind: 'redirect' | 'tree' | 'alias'; url: string; target: string; description: string }
type Props = {
  mode: 'create' | 'edit'
  initial?: Partial<LinkFormValues>
  existingKeywords?: string[]
  redirectKeywords?: string[]
  onSubmit: (values: LinkFormValues) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

export default function LinkForm({ mode, initial, existingKeywords = [], redirectKeywords = [], onSubmit, onCancel, submitLabel }: Props) {
  const [keyword, setKeyword] = useState(initial?.keyword ?? '')
  const [kind, setKind] = useState<'redirect' | 'tree' | 'alias'>(initial?.kind ?? 'redirect')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [target, setTarget] = useState(initial?.target ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [attempted, setAttempted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const normalized = normalizeKeyword(keyword.replace(/^go\//i, ''))
  const keywordError = validateKeyword(normalized) || (mode === 'create' && existingKeywords.includes(normalized) ? `go/${normalized} already exists.` : null)
  const urlError = kind === 'redirect' ? validateUrl(url.trim()) : null
  const normalizedTarget = normalizeKeyword(target.replace(/^go\//i, ''))
  const targetError = kind === 'alias' && (!normalizedTarget || normalizedTarget === normalized || !redirectKeywords.includes(normalizedTarget))
    ? 'Choose a different, existing redirect link.' : null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setAttempted(true)
    setError(null)
    if (keywordError || urlError || targetError) return
    setSubmitting(true)
    try {
      await onSubmit({ keyword: normalized, kind, url: url.trim(), target: normalizedTarget, description: description.trim() })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="gl-card max-w-2xl p-5 sm:p-7 space-y-6">
      <fieldset>
        <legend className="block text-sm font-semibold mb-3">What should this link do?</legend>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className={`block p-4 rounded-xl border cursor-pointer ${kind === 'redirect' ? 'border-[#245fa8] bg-[#eaf2fc] dark:bg-[#17314f] dark:border-[#80b8ff]' : 'border-[#dce3ea] dark:border-[#485563]'}`}>
            <input className="sr-only" type="radio" name="kind" checked={kind === 'redirect'} onChange={() => setKind('redirect')} />
            <span className="block text-sm font-semibold">Redirect to a URL</span><span className="block text-xs gl-muted mt-1">Open a website immediately</span>
          </label>
          <label className={`block p-4 rounded-xl border cursor-pointer ${kind === 'tree' ? 'border-[#245fa8] bg-[#eaf2fc] dark:bg-[#17314f] dark:border-[#80b8ff]' : 'border-[#dce3ea] dark:border-[#485563]'}`}>
            <input className="sr-only" type="radio" name="kind" checked={kind === 'tree'} onChange={() => setKind('tree')} />
            <span className="block text-sm font-semibold">Show a group of links</span><span className="block text-xs gl-muted mt-1">Make a page of child shortcuts</span>
          </label>
          <label className={`block p-4 rounded-xl border cursor-pointer ${kind === 'alias' ? 'border-[#245fa8] bg-[#eaf2fc] dark:bg-[#17314f] dark:border-[#80b8ff]' : 'border-[#dce3ea] dark:border-[#485563]'}`}>
            <input className="sr-only" type="radio" name="kind" checked={kind === 'alias'} onChange={() => setKind('alias')} />
            <span className="block text-sm font-semibold">Alias another link</span><span className="block text-xs gl-muted mt-1">Use its current destination</span>
          </label>
        </div>
      </fieldset>
      <div>
        <label htmlFor="keyword" className="block text-sm font-semibold mb-2">Keyword</label>
        <div className="flex rounded-lg overflow-hidden"><span className="flex items-center px-3 font-mono text-sm gl-muted bg-[#edf2f7] dark:bg-[#26303b] border border-r-0 border-[#cdd7e2] dark:border-[#485563] rounded-l-lg">go/</span><input id="keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} disabled={mode === 'edit'} placeholder="stream/music" autoFocus={mode === 'create'} aria-invalid={attempted && Boolean(keywordError)} aria-describedby="keyword-help" className="gl-input !rounded-l-none font-mono" /></div>
        <p id="keyword-help" className={`text-xs mt-2 ${attempted && keywordError ? 'text-red-700 dark:text-red-300' : 'gl-muted'}`}>{attempted && keywordError ? keywordError : 'Use letters, numbers, dots, hyphens, underscores, or slashes. Nested paths make browsable parent groups.'}</p>
      </div>
      {kind === 'redirect' && <div><label htmlFor="url" className="block text-sm font-semibold mb-2">Destination URL</label><input id="url" className="gl-input" inputMode="url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" aria-invalid={attempted && Boolean(urlError)} aria-describedby="url-help" /><p id="url-help" className={`text-xs mt-2 ${attempted && urlError ? 'text-red-700 dark:text-red-300' : 'gl-muted'}`}>{attempted && urlError ? urlError : 'Where this shortcut opens.'}</p><details className="mt-2 text-xs gl-muted"><summary className="cursor-pointer gl-text-link !text-xs">Advanced URL patterns</summary><p className="mt-2">Use <code>{'{*}'}</code> or <code>%s</code> in the URL to substitute extra words or path segments.</p></details></div>}
      {kind === 'alias' && <div><label htmlFor="target" className="block text-sm font-semibold mb-2">Target link</label><select id="target" className="gl-input" value={target} onChange={(event) => setTarget(event.target.value)} aria-invalid={attempted && Boolean(targetError)} aria-describedby="target-help"><option value="">Choose a redirect link…</option>{redirectKeywords.filter((key) => key !== normalized).sort().map((key) => <option key={key} value={key}>go/{key}</option>)}{target && !redirectKeywords.includes(normalizedTarget) && <option value={target}>go/{target} (missing)</option>}</select><p id="target-help" className={`text-xs mt-2 ${attempted && targetError ? 'text-red-700 dark:text-red-300' : 'gl-muted'}`}>{attempted && targetError ? targetError : 'This alias follows the target when its URL changes.'}</p></div>}
      <div><label htmlFor="description" className="block text-sm font-semibold mb-2">Description <span className="font-normal gl-muted">(optional)</span></label><input id="description" className="gl-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this for?" /></div>
      <div className="rounded-lg px-4 py-3 text-sm bg-[#edf2f7] dark:bg-[#26303b] gl-muted">Preview · <strong className="font-mono text-inherit">go/{normalized || 'your-keyword'}</strong></div>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={submitting} className="gl-btn gl-btn-primary disabled:opacity-60">{submitting ? 'Saving…' : submitLabel ?? (mode === 'create' ? 'Create link' : 'Save changes')}</button>{onCancel && <button type="button" onClick={onCancel} className="gl-btn">Cancel</button>}</div>
    </form>
  )
}
