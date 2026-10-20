import { useState } from 'react'
import AuthButton from '../components/AuthButton'
import { useAuth } from '../hooks/useAuth'
import type { MissMode } from '../lib/resolve'
import { getSettings, setPathMiss } from '../lib/settings'

const defaultSearch = 'https://go.mhiebl.com/?q=%s'
const siteSearch = 'https://go.mhiebl.com/%s'

export default function Settings() {
  const { user, isOwner } = useAuth()
  const [pathMiss, setPathMissState] = useState<MissMode>(() => getSettings().pathMiss)
  const [copied, setCopied] = useState('')

  function handleChange(mode: MissMode) { setPathMiss(mode); setPathMissState(mode) }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setCopied(value) } catch { setCopied('Copy failed') } }

  return <div className="gl-page"><h1 className="gl-title">Settings</h1><p className="gl-subtitle mt-2 mb-8">Browser behavior and setup for this device.</p>
    <section className="py-6 border-b border-[#dce3ea] dark:border-[#333d48]"><h2 className="font-semibold text-lg mb-2">Account</h2><p className="gl-subtitle text-sm mb-4">{isOwner ? `Signed in as ${user?.displayName ?? user?.email ?? 'the owner'}. You can manage links.` : 'Sign in with the owner’s Google account to manage links.'}</p><AuthButton /></section>
    <section className="py-6 border-b border-[#dce3ea] dark:border-[#333d48]"><h2 className="font-semibold text-lg mb-2">When a direct go/ path does not match</h2><p className="gl-subtitle text-sm mb-4">This choice is saved in this browser. Queries from the default search engine always search Google on a miss.</p><label className="flex items-start gap-3 py-2 text-sm cursor-pointer"><input type="radio" name="pathMiss" className="mt-1 accent-[#245fa8]" checked={pathMiss === 'create'} onChange={() => handleChange('create')} /><span>Show the missing-link page with create and Google options</span></label><label className="flex items-start gap-3 py-2 text-sm cursor-pointer"><input type="radio" name="pathMiss" className="mt-1 accent-[#245fa8]" checked={pathMiss === 'google'} onChange={() => handleChange('google')} /><span>Go straight to Google</span></label></section>
    <section className="py-6"><h2 className="font-semibold text-lg mb-2">Set up Chrome</h2><p className="gl-subtitle text-sm mb-5">Choose how you want to type go links from the address bar.</p><div className="space-y-6"><div><h3 className="font-semibold text-sm">1 · Default search engine</h3><p className="gl-subtitle text-sm mt-1">Every address bar search checks go/ first, then falls back to Google. Add this URL in Chrome’s search engine settings.</p><div className="gl-card flex items-center gap-3 px-3 py-2 mt-3"><code className="font-mono text-xs break-all flex-1">{defaultSearch}</code><button type="button" className="gl-text-link shrink-0" onClick={() => void copy(defaultSearch)}>{copied === defaultSearch ? 'Copied' : 'Copy'}</button></div></div><div><h3 className="font-semibold text-sm">2 · Site search shortcut</h3><p className="gl-subtitle text-sm mt-1">Type “go”, press Tab, then type a keyword. Add a site search entry with keyword <code>go</code> and this URL.</p><div className="gl-card flex items-center gap-3 px-3 py-2 mt-3"><code className="font-mono text-xs break-all flex-1">{siteSearch}</code><button type="button" className="gl-text-link shrink-0" onClick={() => void copy(siteSearch)}>{copied === siteSearch ? 'Copied' : 'Copy'}</button></div></div></div>{copied === 'Copy failed' && <p role="alert" className="text-red-700 dark:text-red-300 text-sm mt-3">Copy failed. Select the URL above to copy it manually.</p>}</section>
  </div>
}
