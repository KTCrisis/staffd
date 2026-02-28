'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAuth, type AuthUser }               from '@/lib/auth'
import { useRouter }                            from '@/lib/navigation'
import { useEffect }                            from 'react'

interface AuthContextValue {
  user:    AuthUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router            = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login' as never)
    }
  }, [user, loading, router])

  // Pendant le chargement — écran noir minimal
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg)', color: 'var(--text2)',
        fontFamily: 'var(--font)', fontSize: 12, letterSpacing: 2,
      }}>
        // loading...
      </div>
    )
  }

  // Non connecté — ne rien afficher (redirect en cours)
  if (!user) return null

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
