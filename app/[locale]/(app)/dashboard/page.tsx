import { redirect }           from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies }            from 'next/headers'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function DashboardPage({ params }: Props) {
  const { locale }    = await params
  const cookieStore   = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.user_role

  // Préfixe de locale — 'en' est la locale par défaut, pas de préfixe
  const p = (path: string) => locale === 'en' ? path : `/${locale}${path}`

  if (!role)                                        redirect(p('/login'))
  if (role === 'consultant')                        redirect(p('/dashboard/consultant'))
  if (role === 'manager')                           redirect(p('/dashboard/manager'))
  if (role === 'admin' || role === 'super_admin')   redirect(p('/dashboard/admin'))

  redirect(p('/login'))
}