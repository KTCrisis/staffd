'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useRouter } from '@/lib/navigation'
import type { AuthUser, UserRole } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  user:        AuthUser | null
  loading:     boolean
  companyMode: 'solo' | 'team' | null
  companyName: string | null
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, companyMode: null, companyName: null })

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user,        setUser]        = useState<AuthUser | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [companyMode, setCompanyMode] = useState<'solo' | 'team' | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)

  // Fetch company mode + name after user is set
  const fetchCompanyMode = async (companyId: string | null) => {
    if (!companyId) { setCompanyMode(null); setCompanyName(null); return }
    const { data } = await supabase
      .from('companies')
      .select('mode, name')
      .eq('id', companyId)
      .single()
    setCompanyMode((data?.mode as 'solo' | 'team') ?? 'team')
    setCompanyName(data?.name ?? null)
  }

  useEffect(() => {
    const checkUser = async () => {
      try {
        await supabase.auth.refreshSession() 
        // getUser() vérifie la session côté serveur (non falsifiable)
        const { data: { user: supaUser }, error } = await supabase.auth.getUser()

        if (error || !supaUser) {
          setUser(null)
          return
        }

        // Rôle depuis app_metadata (non modifiable par l'utilisateur)
        const role = (supaUser.app_metadata?.user_role ?? 'viewer') as UserRole
        const companyId = supaUser.app_metadata?.company_id ?? null
        setUser({ id: supaUser.id, email: supaUser.email ?? '', role, companyId })
        await fetchCompanyMode(companyId)
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
        const role = (session.user.app_metadata?.user_role ?? 'viewer') as UserRole
        const companyId = session.user.app_metadata?.company_id ?? null
        setUser({ id: session.user.id, email: session.user.email ?? '', role, companyId })
        fetchCompanyMode(companyId)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => { subscription.unsubscribe() }
  }, [])

  // Redirection de sécurité côté client (le middleware gère déjà côté serveur)
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
    <AuthContext.Provider value={{ user, loading, companyMode, companyName }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)