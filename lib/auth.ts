'use client'

import { supabase } from './supabase'

export type UserRole = 'admin' | 'manager' | 'consultant' | 'viewer'

export interface AuthUser {
  id:    string
  email: string
  role:  UserRole
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const role = (user.user_metadata?.user_role ?? 'viewer') as UserRole

  return {
    id:    user.id,
    email: user.email ?? '',
    role,
  }
}

// ── Hook : écoute les changements de session ──────────────────
import { useEffect, useState } from 'react'

export function useAuth() {
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupérer la session initiale
    getUser().then(u => {
      setUser(u)
      setLoading(false)
    })

    // Écouter les changements (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any) => {
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
export const isAdmin   = (role?: UserRole) => role === 'admin'
export const isManager = (role?: UserRole) => role === 'admin' || role === 'manager'
export const canEdit   = (role?: UserRole) => role === 'admin' || role === 'manager'
export const canViewFinancials = (role?: UserRole) => role === 'admin'
