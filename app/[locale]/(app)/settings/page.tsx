'use client'

// ══════════════════════════════════════════════════════════════
// app/[locale]/(app)/settings/page.tsx
// Orchestrateur : tabs + routing. Toute la logique est dans
// les composants settings/XxxTab.tsx
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useAuthContext }      from '@/components/layout/AuthProvider'
import { isAdmin, isSuperAdmin } from '@/lib/auth'
import { useRouter }           from '@/lib/navigation'
import { Topbar }              from '@/components/layout/Topbar'

import { CompanyTab }    from '@/components/settings/CompanyTab'
import { TeamTab }       from '@/components/settings/TeamTab'
import { HRTab }         from '@/components/settings/HRTab'
import { BillingTab }    from '@/components/settings/BillingTab'
import { AITab }         from '@/components/settings/AITab'
import { SuperAdminTab } from '@/components/settings/SuperAdminTab'

// ── Types ─────────────────────────────────────────────────────

type Tab = 'company' | 'team' | 'hr' | 'billing' | 'ai' | 'superadmin'

const TABS: { id: Tab; label: string; icon: string; superOnly?: boolean }[] = [
  { id: 'company',    label: 'Company',     icon: '🏢' },
  { id: 'team',       label: 'Team',        icon: '◈'  },
  { id: 'hr',         label: 'HR',          icon: '📅' },
  { id: 'billing',    label: 'Billing',     icon: '🧾' },
  { id: 'ai',         label: 'AI & MCP',    icon: '🤖' },
  { id: 'superadmin', label: 'Super Admin', icon: '⬡',  superOnly: true },
]

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const { user }    = useAuthContext()
  const router      = useRouter()
  const adminAccess = isAdmin(user?.role)
  const superAccess = isSuperAdmin(user?.role)

  const [activeTab, setActiveTab] = useState<Tab>('company')

  useEffect(() => {
    if (user && !adminAccess) router.push('/dashboard' as never)
  }, [user, adminAccess, router])

  if (!user || !adminAccess) return null

  const visibleTabs = TABS.filter(tab => !tab.superOnly || superAccess)
  const ctaLabel    = activeTab === 'team' ? '+ Nouvelle équipe' : undefined

  return (
    <>
      <Topbar title="Settings" breadcrumb="// configuration" ctaLabel={ctaLabel} />

      <div className="app-content settings-layout">

        {/* Tabs */}
        <div className="settings-tabs">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`settings-tab ${activeTab === tab.id ? 'settings-tab--active' : ''}`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu par onglet */}
        {activeTab === 'company'    && <CompanyTab />}
        {activeTab === 'team'       && <TeamTab companyId={user.companyId ?? ''} />}
        {activeTab === 'hr'         && <HRTab />}
        {activeTab === 'billing'    && <BillingTab />}
        {activeTab === 'ai'         && <AITab />}
        {activeTab === 'superadmin' && superAccess && <SuperAdminTab />}

      </div>
    </>
  )
}