// lib/auth/page-auth.ts
// Server-side only — pas de 'use client'

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { UserRole }      from './roles'

export interface PageAuth {
  user:        any
  role:        UserRole | undefined
  isSA:        boolean
  userId:      string | undefined
  companyId:   string | undefined
  companyName: string | undefined
  supabase:    ReturnType<typeof createServerClient>
}

export async function getPageAuth(tenant?: string): Promise<PageAuth> {
  const cookieStore = await cookies()

  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await anonClient.auth.getUser()

  const role      = user?.app_metadata?.user_role as UserRole | undefined
  const isSA      = role === 'super_admin'
  const userId    = user?.id
  const companyId = user?.app_metadata?.company_id as string | undefined

  // Super admin → service_role pour bypass RLS
  const supabase = isSA
    ? createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
      )
    : anonClient

  // Fetch company name pour le badge topbar
  let companyName: string | undefined
  if (!isSA && companyId) {
    const { data } = await anonClient
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .maybeSingle()
    companyName = data?.name ?? undefined
  }

  return { user, role, isSA, userId, companyId, companyName, supabase }
}