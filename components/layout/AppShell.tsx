// components/layout/AppShell.tsx

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect }           from 'next/navigation'
import { AuthProvider }       from '@/components/layout/AuthProvider'
import { Sidebar }            from '@/components/layout/Sidebar'
import type { ReactNode }     from 'react'

export default async function AppShell({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userRole  = (user.app_metadata?.user_role ?? 'viewer') as string
  const userEmail = user.email ?? ''
  const companyId = user.app_metadata?.company_id as string | undefined
  const isSA      = user.app_metadata?.is_super_admin === true

  let companyMode: 'solo' | 'team' | null = null

  if (isSA) {
    companyMode = 'team'
  } else if (companyId) {
    const { data } = await supabase
      .from('companies')
      .select('mode')
      .eq('id', companyId)
      .single()
    companyMode = (data?.mode as 'solo' | 'team') ?? 'team'
  }

  return (
    <AuthProvider>
      <div className="app-shell">
        <Sidebar
          userRole={userRole}
          userEmail={userEmail}
          companyMode={companyMode}
        />
        <div className="app-main">
          <main className="app-content">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  )
}