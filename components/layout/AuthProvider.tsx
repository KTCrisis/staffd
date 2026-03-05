'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useRouter } from '@/lib/navigation'
import type { AuthUser, UserRole } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  user:        AuthUser | null
  loading:     boolean
  companyName: string | null
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, companyName: null })

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user,        setUser]        = useState<AuthUser | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [companyName, setCompanyName] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      try {
        await supabase.auth.refreshSession()
        const { data: { user: supaUser }, error } = await supabase.auth.getUser()

        if (error || !supaUser) {
          setUser(null)
          return
        }

        const role      = (supaUser.app_metadata?.user_role ?? 'viewer') as UserRole
        const companyId = supaUser.app_metadata?.company_id ?? null

        setUser({ id: supaUser.id, email: supaUser.email ?? '', role, companyId })

        // Nom du tenant — super_admin affiche "staffd"
        if (role === 'super_admin') {
          setCompanyName('staffd')
        } else if (companyId) {
          const { data } = await supabase
            .from('companies')
            .select('name')
            .eq('id', companyId)
            .single()
          setCompanyName(data?.name ?? null)
        }
      } catch (error) {
        console.error('Auth error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const role      = (session.user.app_metadata?.user_role ?? 'viewer') as UserRole
        const companyId = session.user.app_metadata?.company_id ?? null
        setUser({ id: session.user.id, email: session.user.email ?? '', role, companyId })

        if (role === 'super_admin') {
          setCompanyName('staffd')
        } else if (companyId) {
          const { data } = await supabase
            .from('companies')
            .select('name')
            .eq('id', companyId)
            .single()
          setCompanyName(data?.name ?? null)
        }
      } else {
        setUser(null)
        setCompanyName(null)
      }
      setLoading(false)
    })

    return () => { subscription.unsubscribe() }
  }, [])

  // Redirection de sécurité côté client
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
        height: '100vh', background: '#0a0a0a',
        fontFamily: 'monospace',
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
          staff<span style={{ color: '#00ff00' }}>7</span>
        </div>
        <div style={{ fontSize: 10, color: '#666', letterSpacing: 3 }}>
          // initialisation_session...
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <AuthContext.Provider value={{ user, loading, companyName }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)