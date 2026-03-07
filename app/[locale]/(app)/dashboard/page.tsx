// app/[locale]/(app)/dashboard/page.tsx
// ── Server Component ─────────────────────────────────────────
// Lit le rôle depuis le JWT app_metadata côté serveur,
// redirect immédiat sans hydration ni flash "// loading…"
// Avant : 'use client' + useEffect + useAuth → 1 render inutile
// Après : async Server Component → redirect avant le premier paint

import { redirect }           from 'next/navigation'
import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export default async function DashboardPage() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  // getUser() vérifie le JWT côté serveur (plus sûr que getSession())
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.user_role as string | undefined

  if (role === 'consultant')                           redirect('/dashboard/consultant')
  if (role === 'manager')                              redirect('/dashboard/manager')
  if (role === 'admin' || role === 'super_admin')      redirect('/dashboard/admin')

  // Fallback : pas de rôle connu → retour login
  // (le middleware gère déjà le cas "pas de session",
  //  ce fallback couvre un app_metadata mal formé)
  redirect('/login')
}