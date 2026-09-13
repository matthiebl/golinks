import { useState, type FormEvent } from 'react'

export type LinkFormValues = {
  keyword: string
  url: string
  description: string
}

type LinkFormProps = {
  mode: 'create' | 'edit'
  initial?: Partial<LinkFormValues>
  onSubmit: (values: LinkFormValues) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

const inputClasses =
  'w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10 disabled:opacity-60'

export default function LinkForm({ mode, initial, onSubmit, onCancel, submitLabel }: LinkFormProps) {
  const [keyword, setKeyword] = useState(initial?.keyword ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({ keyword: keyword.trim(), url: url.trim(), description: description.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="keyword" className="block text-sm font-medium mb-1">
          Keyword
        </label>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 dark:text-gray-600 text-sm font-mono shrink-0">go/</span>
          <input
            id="keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={mode === 'edit'}
            placeholder="a/b/c"
            autoFocus={mode === 'create'}
            className={`${inputClasses} font-mono`}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="url" className="block text-sm font-medium mb-1">
          Destination URL
        </label>
        <input
          id="url"
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className={inputClasses}
          required
        />
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
          Optionally include <code className="font-mono">{'{*}'}</code> or{' '}
          <code className="font-mono">%s</code> to substitute extra words or path segments, e.g.{' '}
          <code className="font-mono">https://google.com/search?q={'{*}'}</code>
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description <span className="text-gray-400 dark:text-gray-600 font-normal">(optional)</span>
        </label>
        <input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this link is for"
          className={inputClasses}
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-60"
        >
          {submitting ? 'Saving…' : submitLabel ?? (mode === 'create' ? 'Create link' : 'Save changes')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
