'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useRouter }   from '@/lib/navigation'
import { supabase }    from '@/lib/supabase'
import type { AuthUser, UserRole } from '@/lib/auth'

interface AuthContextValue {
  user:    AuthUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const router                = useRouter()
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupérer la session existante directement depuis Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = (session.user.user_metadata?.user_role ?? 'viewer') as UserRole
        setUser({ id: session.user.id, email: session.user.email ?? '', role })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    // Écouter les changements (login / logout / refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const role = (session.user.user_metadata?.user_role ?? 'viewer') as UserRole
        setUser({ id: session.user.id, email: session.user.email ?? '', role })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Redirect si pas de session
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login' as never)
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
        height: '100vh', background: 'var(--bg)',
        fontFamily: 'var(--font)',
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
          staff<span style={{ color: 'var(--green)' }}>d</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 3 }}>
          // chargement...
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)