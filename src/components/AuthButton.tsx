import { useAuth } from '../hooks/useAuth'

export default function AuthButton() {
  const { user, loading, isOwner, signIn, signOutUser } = useAuth()

  if (loading) return null

  if (!user) {
    return (
      <button
        onClick={() => signIn()}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        Sign in
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {user.photoURL && (
        <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
      )}
      <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
        {isOwner ? user.displayName ?? user.email : 'Signed in (view only)'}
      </span>
      <button
        onClick={() => signOutUser()}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}
