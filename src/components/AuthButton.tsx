import { useAuth } from '../hooks/useAuth'

export default function AuthButton({ compact = false }: { compact?: boolean }) {
  const { user, loading, isOwner, signIn, signOutUser } = useAuth()
  if (loading) return null
  if (!user) return <button type="button" onClick={() => void signIn().catch(() => {})} className={compact ? 'gl-text-link whitespace-nowrap' : 'gl-btn'}>Sign in</button>

  const name = isOwner ? (user.displayName ?? user.email ?? 'Owner') : 'View only'
  if (!compact) return <div className="flex flex-wrap items-center gap-3"><span className="gl-muted text-sm">{name}</span><button type="button" onClick={() => void signOutUser()} className="gl-btn">Sign out</button></div>

  return <details className="relative group"><summary className="list-none cursor-pointer flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#edf2f7] dark:hover:bg-[#26303b]" aria-label={`Account: ${name}`}><span className="w-7 h-7 grid place-items-center rounded-full bg-[#eaf2fc] dark:bg-[#17314f] text-[#245fa8] dark:text-[#9dcaff] text-xs font-bold">{user.photoURL ? <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" /> : name.charAt(0).toUpperCase()}</span><span className="gl-account-name gl-muted text-xs max-w-36 truncate">{name}</span><span aria-hidden="true" className="gl-muted text-xs">⌄</span></summary><div className="gl-card absolute right-0 top-full mt-2 z-30 p-3 w-52 shadow-lg"><p className="text-xs gl-muted mb-3 truncate">{user.email}</p><button type="button" onClick={() => void signOutUser()} className="gl-btn w-full">Sign out</button></div></details>
}
