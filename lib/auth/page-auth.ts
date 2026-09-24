// lib/auth/page-auth.ts
// Server-side only — pas de 'use client'

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { serverCookies }      from '@/lib/supabase-cookies'
import type { User }          from '@supabase/supabase-js'
import type { Database }      from '@/types/supabase'
import type { UserRole }      from './roles'
import { getRequestAuth }     from './request-auth'

export interface PageAuth {
  user:        User | null
  role:        UserRole | undefined
  isSA:        boolean
  userId:      string | undefined
  companyId:   string | undefined
  companyName: string | undefined
  /** Réglages RH de la société de l'utilisateur (null pour super_admin) */
  hrSettings:  unknown
  supabase:    ReturnType<typeof createServerClient>
}

export async function getPageAuth(_tenant?: string): Promise<PageAuth> {
  // Session et société lues une seule fois par requête (partagées avec AppShell)
  const { user, companyId, company, anon: anonClient } = await getRequestAuth()

  const role   = user?.app_metadata?.user_role as UserRole | undefined
  const isSA   = role === 'super_admin'
  const userId = user?.id

  // Super admin → service_role pour bypass RLS
  const supabase = isSA
    ? createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: serverCookies(await cookies()) }
      )
    : anonClient

  // Nom pour le badge topbar, réglages RH pour les calendriers
  const companyName = company?.name ?? undefined
  const hrSettings  = company?.hr_settings ?? null

  return { user, role, isSA, userId, companyId, companyName, hrSettings, supabase }
}
