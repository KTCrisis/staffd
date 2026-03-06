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

import { CompanyTab }          from '@/components/settings/CompanyTab'
import { TeamTab }             from '@/components/settings/TeamTab'
import { HRTab }               from '@/components/settings/HRTab'
import { BillingTab }          from '@/components/settings/BillingTab'
import { AITab }               from '@/components/settings/AITab'
import { SuperAdminTab }       from '@/components/settings/SuperAdminTab'

// ── Types ─────────────────────────────────────────────────────
type Tab = 'company' | 'team' | 'hr' | 'billing' | 'ai' | 'superadmin'

const TABS: {
  id: Tab; label: string; icon: string
  superOnly?: boolean
}[] = [
  { id: 'company',    label: 'Company',     icon: '🏢' },
  { id: 'team',       label: 'Team',        icon: '◈' },
  { id: 'hr',         label: 'HR',          icon: '📅' },
  { id: 'billing',    label: 'Billing',     icon: '🧾' },
  { id: 'ai',         label: 'AI & MCP',    icon: '🤖' },
  { id: 'superadmin', label: 'Super Admin', icon: '⬡', superOnly: true },
]

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const { user }    = useAuthContext()
  const router      = useRouter()
  const adminAccess = isAdmin(user?.role)
  const superAccess = isSuperAdmin(user?.role)

  useEffect(() => {
    if (user && !adminAccess) router.push('/dashboard' as never)
  }, [user, adminAccess, router])

  if (!user || !adminAccess) return null

  const [activeTab, setActiveTab] = useState<Tab>('company')

  const visibleTabs = TABS.filter(tab => tab.superOnly ? superAccess : true)

  const ctaLabel = activeTab === 'team' ? '+ Nouvelle équipe' : undefined

  return (
    <>
      <Topbar
        title="Settings"
        breadcrumb="// configuration"
        ctaLabel={ctaLabel}
      />

      <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex', gap: 2,
          borderBottom: '1px solid var(--border)',
        }}>
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                fontSize: 11, padding: '8px 16px',
                background: 'none', border: 'none',
                borderBottom: activeTab === tab.id
                  ? '2px solid var(--cyan)'
                  : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--cyan)' : 'var(--text2)',
                cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: activeTab === tab.id ? 700 : 400,
                transition: 'color 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
                marginBottom: -1,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Contenu par onglet ── */}
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