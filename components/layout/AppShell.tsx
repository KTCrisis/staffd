// components/layout/AppShell.tsx

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect }           from 'next/navigation'
import { AuthProvider }       from '@/components/layout/AuthProvider'
import { Sidebar }            from '@/components/layout/Sidebar'
import { resolveBranding, headingFontHref, DEFAULT_BRANDING } from '@/lib/branding'
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
  const isSA      = userRole === 'super_admin'  
  let companyMode: 'solo' | 'team' | null = null
  // super_admin browses every tenant: keep the product's own look.
  let branding = DEFAULT_BRANDING

  if (isSA) {
    companyMode = 'team'
  } else if (companyId) {
    const { data } = await supabase
      .from('companies')
      .select('mode, branding')
      .eq('id', companyId)
      .maybeSingle()                           
    companyMode = (data?.mode as 'solo' | 'team') ?? 'team'
    branding    = resolveBranding(data?.branding)
  }

  const fontHref = headingFontHref(branding.headingFont)

  return (
    <AuthProvider>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      {/* Values are whitelisted tokens + validated color literals (lib/branding.ts). */}
      {branding.css && <style dangerouslySetInnerHTML={{ __html: branding.css }} />}
      <div className="app-shell">
        <Sidebar
          userRole={userRole}
          userEmail={userEmail}
          companyMode={companyMode}
          brandName={branding.name}
          brandTagline={branding.tagline}
        />
        <div className="app-main">
          {children}
        </div>
      </div>
    </AuthProvider>
  )
}