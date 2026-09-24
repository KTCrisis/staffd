// lib/auth/request-auth.ts
// Server-side only — pas de 'use client'
//
// Une seule vérification de session et une seule lecture de la société par
// requête. Le gabarit (AppShell) et la page (getPageAuth) appelaient chacun
// getUser() puis lisaient `companies` : deux allers-retours vers Supabase de
// plus à chaque page. React `cache` partage le résultat entre les composants
// serveur d'une même requête, et seulement d'une même requête.

import { cache }              from 'react'
import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { serverCookies }      from '@/lib/supabase-cookies'
import type { User }          from '@supabase/supabase-js'
import type { Database }      from '@/types/supabase'

export interface RequestCompany {
  name:        string | null
  mode:        string | null
  branding:    unknown
  hr_settings: unknown
}

export interface RequestAuth {
  user:      User | null
  companyId: string | undefined
  company:   RequestCompany | null
  anon:      ReturnType<typeof createServerClient<Database>>
}

export const getRequestAuth = cache(async (): Promise<RequestAuth> => {
  const cookieStore = await cookies()
  const anon = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: serverCookies(cookieStore) },
  )

  const { data: { user } } = await anon.auth.getUser()
  const companyId = user?.app_metadata?.company_id as string | undefined
  const isSA      = user?.app_metadata?.user_role === 'super_admin'

  let company: RequestCompany | null = null
  if (user && companyId && !isSA) {
    const { data } = await anon
      .from('companies')
      .select('name, mode, branding, hr_settings')
      .eq('id', companyId)
      .maybeSingle()
    company = (data as RequestCompany | null) ?? null
  }

  return { user, companyId, company, anon }
})
