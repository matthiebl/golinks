import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth, googleProvider, OWNER_UID } from '../lib/firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const isOwner = Boolean(user && OWNER_UID && user.uid === OWNER_UID)

  return {
    user,
    loading,
    isOwner,
    signIn: () => signInWithPopup(auth, googleProvider),
    signOutUser: () => signOut(auth),
  }
}
