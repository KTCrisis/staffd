'use client'

import { AuthProvider }    from '@/components/layout/AuthProvider'
import { TenantProvider }  from '@/lib/tenant-context'
import { Sidebar }         from '@/components/layout/Sidebar'
import { ReactNode }       from 'react'

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider>
        <div className="app-shell">
          <Sidebar />
          <main className="app-main">
            {children}
          </main>
        </div>
      </TenantProvider>
    </AuthProvider>
  )
}