'use client'

import { supabase } from './supabase'

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'consultant' | 'viewer'

export interface AuthUser {
  id:        string
  email:     string
  role:      UserRole
  companyId: string | null
}

// ── Login ─────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

// ── Logout ────────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

// ── Utilisateur courant ───────────────────────────────────────
export async function getUser(): Promise<AuthUser | null> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const role = (user.app_metadata?.user_role ?? 'viewer') as UserRole
  return {
    id:        user.id,
    email:     user.email ?? '',
    role,
    companyId: user.app_metadata?.company_id ?? null,
  }
}

// ── Hook ──────────────────────────────────────────────────────
import { useEffect, useState } from 'react'

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

// ── Helpers de rôle ───────────────────────────────────────────
// super_admin > admin > manager > consultant > viewer
export const isSuperAdmin      = (role?: UserRole) => role === 'super_admin'
export const isAdmin           = (role?: UserRole) => role === 'super_admin' || role === 'admin'
export const isManager         = (role?: UserRole) => role === 'super_admin' || role === 'admin' || role === 'manager'
export const canEdit           = (role?: UserRole) => role === 'super_admin' || role === 'admin' || role === 'manager'
export const canViewFinancials = (role?: UserRole) => role === 'super_admin' || role === 'admin'