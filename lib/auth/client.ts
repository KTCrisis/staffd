/**
 * lib/auth/client.ts
 * Auth côté client — signIn, signOut, getUser, useAuth, useRequireRole
 */

'use client'

import { useEffect, useState }          from 'react'
import { useRouter }                    from 'next/navigation'
import { supabase }                     from '../supabase'
import type { AuthUser, UserRole }      from './roles'
import { isSuperAdmin as _isSuperAdmin } from './roles'

// ──────────────────────────────────────────────────────────────
// ACTIONS
// ──────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

// ──────────────────────────────────────────────────────────────
// UTILISATEUR COURANT
// ──────────────────────────────────────────────────────────────

export async function getUser(): Promise<AuthUser | null> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  return {
    id:        user.id,
    email:     user.email ?? '',
    role:      (user.app_metadata?.user_role ?? 'viewer') as UserRole,
    companyId: user.app_metadata?.company_id ?? null,
  }
}

// ──────────────────────────────────────────────────────────────
// HOOK — useAuth
// ──────────────────────────────────────────────────────────────

export function useAuth() {
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUser().then(u => { setUser(u); setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const u = await getUser()
        setUser(u)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}

// ──────────────────────────────────────────────────────────────
// HOOK — useRequireRole
// Guard client-side pour les pages qui ont besoin d'un rôle minimum.
// Le middleware gère déjà le cas non-authentifié — ce hook couvre
// les cas où le rôle change dynamiquement (ex: super_admin switch tenant).
//
// Usage :
//   const { user, loading } = useRequireRole(isAdmin)
//   if (loading) return <Spinner />
// ──────────────────────────────────────────────────────────────

export function useRequireRole(
  check: (role?: UserRole) => boolean,
  redirectTo = '/dashboard',
) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !check(user.role)) {
      router.replace(redirectTo)
    }
  }, [user, loading, check, redirectTo, router])

  return { user, loading }
}