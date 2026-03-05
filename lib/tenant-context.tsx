'use client'

/**
 * lib/tenant-context.tsx
 * Contexte léger pour l'org switcher super_admin.
 * Séparé d'AuthProvider pour éviter toute dépendance circulaire
 * (data.ts peut l'importer sans risque).
 *
 * Usage :
 *   - AppShell wrap avec <TenantProvider>
 *   - OrgSwitcher appelle setActiveTenantId
 *   - data.ts hooks lisent activeTenantId et filtrent si != null
 */

import { createContext, useContext, useState, ReactNode } from 'react'

interface TenantContextValue {
  activeTenantId:    string | null
  setActiveTenantId: (id: string | null) => void
}

const TenantContext = createContext<TenantContextValue>({
  activeTenantId:    null,
  setActiveTenantId: () => {},
})

export function TenantProvider({ children }: { children: ReactNode }) {
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null)
  return (
    <TenantContext.Provider value={{ activeTenantId, setActiveTenantId }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useActiveTenant = () => useContext(TenantContext)