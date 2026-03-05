'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useRouter } from '@/lib/navigation'
import type { AuthUser, UserRole } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  user:        AuthUser | null
  loading:     boolean
  companyName: string | null
  companyMode: 'solo' | 'team' | null
}

const AuthContext = createContext<AuthContextValue>({
  user: null, loading: true, companyName: null, companyMode: null,
})

// ── Helper : fetch company name + mode ───────────────────────
async function fetchCompanyInfo(
  role: UserRole,
  companyId: string | null
): Promise<{ name: string | null; mode: 'solo' | 'team' | null }> {
  if (role === 'super_admin') return { name: 'staff7', mode: 'team' }
  if (!companyId) return { name: null, mode: null }
  const { data } = await supabase
    .from('companies')
    .select('name, mode')
    .eq('id', companyId)
    .single()
  return {
    name: data?.name ?? null,
    mode: (data?.mode as 'solo' | 'team') ?? 'team',
  }
}

// ── Helper : build AuthUser from supabase user ────────────────
function buildUser(supaUser: any): AuthUser {
  const role      = (supaUser.app_metadata?.user_role ?? 'viewer') as UserRole
  const companyId = supaUser.app_metadata?.company_id ?? null
  return { id: supaUser.id, email: supaUser.email ?? '', role, companyId }
}

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user,        setUser]        = useState<AuthUser | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [companyMode, setCompanyMode] = useState<'solo' | 'team' | null>(null)

  useEffect(() => {
    let mounted = true

    // onAuthStateChange est la source de vérité principale
    // Il se déclenche immédiatement avec la session courante (INITIAL_SESSION)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      if (session?.user) {
        const authUser = buildUser(session.user)
        setUser(authUser)
        // Fetch company info en arrière-plan (non-bloquant)
        fetchCompanyInfo(authUser.role, authUser.companyId)
          .then(({ name, mode }) => {
            if (!mounted) return
            setCompanyName(name)
            setCompanyMode(mode)
          })
          .catch(() => {})
      } else {
        setUser(null)
        setCompanyName(null)
        setCompanyMode(null)
      }

      // Loading résolu dès le premier événement
      if (mounted) setLoading(false)
    })

    // Timeout de sécurité — si onAuthStateChange ne répond pas en 3s
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 3000)

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redirection si pas de session après chargement
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
    <AuthContext.Provider value={{ user, loading, companyName, companyMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)