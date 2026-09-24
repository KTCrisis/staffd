// components/layout/AppShell.tsx

import { getRequestAuth }     from '@/lib/auth/request-auth'
import { redirect }           from 'next/navigation'
import { AuthProvider }       from '@/components/layout/AuthProvider'
import { Sidebar }            from '@/components/layout/Sidebar'
import { resolveBranding, headingFontHref, DEFAULT_BRANDING } from '@/lib/branding'
import type { ReactNode }     from 'react'

export default async function AppShell({ children }: { children: ReactNode }) {
  // Session et société lues une seule fois par requête (partagées avec getPageAuth)
  const { user, companyId, company } = await getRequestAuth()
  if (!user) redirect('/login')

  const userRole  = (user.app_metadata?.user_role ?? 'viewer') as string
  const userEmail = user.email ?? ''
  const isSA      = userRole === 'super_admin'
  let companyMode: 'solo' | 'team' | null = null
  // super_admin browses every tenant: keep the product's own look.
  let branding = DEFAULT_BRANDING

  if (isSA) {
    companyMode = 'team'
  } else if (companyId) {
    companyMode = (company?.mode as 'solo' | 'team') ?? 'team'
    branding    = resolveBranding(company?.branding as Parameters<typeof resolveBranding>[0])
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