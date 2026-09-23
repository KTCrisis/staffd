// lib/auth/page-auth.ts
// Server-side only — pas de 'use client'

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { serverCookies }      from '@/lib/supabase-cookies'
import type { User }          from '@supabase/supabase-js'
import type { Database }      from '@/types/supabase'
import type { UserRole }      from './roles'

export interface PageAuth {
  user:        User | null
  role:        UserRole | undefined
  isSA:        boolean
  userId:      string | undefined
  companyId:   string | undefined
  companyName: string | undefined
  supabase:    ReturnType<typeof createServerClient>
}

export async function getPageAuth(_tenant?: string): Promise<PageAuth> {
  const cookieStore = await cookies()

  const anonClient = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: serverCookies(cookieStore) }
  )

  const { data: { user } } = await anonClient.auth.getUser()

  const role      = user?.app_metadata?.user_role as UserRole | undefined
  const isSA      = role === 'super_admin'
  const userId    = user?.id
  const companyId = user?.app_metadata?.company_id as string | undefined

  // Super admin → service_role pour bypass RLS
  const supabase = isSA
    ? createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: serverCookies(cookieStore) }
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