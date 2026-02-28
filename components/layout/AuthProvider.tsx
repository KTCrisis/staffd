'use client'
import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useRouter } from '@/lib/navigation'
import type { AuthUser, UserRole } from '@/lib/auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let sub: any = null

    const timeout = setTimeout(() => {
      setUser(null)
      setLoading(false)
    }, 5000)

    import('@/lib/supabase').then(({ createSupabaseClient }) => {
      const supabase = createSupabaseClient()

      supabase.auth.getSession().then(({ data: { session } }: any) => {
        clearTimeout(timeout)
        if (session?.user) {
          const role = (session.user.user_metadata?.user_role ?? 'viewer') as UserRole
          setUser({ id: session.user.id, email: session.user.email ?? '', role })
        } else {
          setUser(null)
        }
        setLoading(false)
      })

      const { data } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        if (session?.user) {
          const role = (session.user.user_metadata?.user_role ?? 'viewer') as UserRole
          setUser({ id: session.user.id, email: session.user.email ?? '', role })
        } else {
          setUser(null)
        }
        setLoading(false)
      })
      sub = data.subscription
    })

    return () => {
      clearTimeout(timeout)
      sub?.unsubscribe()
    }
  }, [])

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