'use client'

// ══════════════════════════════════════════════════════════════
// app/[locale]/(app)/settings/page.tsx
// ══════════════════════════════════════════════════════════════

import { useState, useEffect }   from 'react'
import { useTranslations }       from 'next-intl'
import { useAuthContext }        from '@/components/layout/AuthProvider'
import { isAdmin, isSuperAdmin } from '@/lib/auth'
import { useRouter }             from '@/lib/navigation'
import { Topbar }                from '@/components/layout/Topbar'

import { CompanyTab }    from '@/components/settings/CompanyTab'
import { TeamTab }       from '@/components/settings/TeamTab'
import { HRTab }         from '@/components/settings/HRTab'
import { BillingTab }    from '@/components/settings/BillingTab'
import { AITab }         from '@/components/settings/AITab'
import { SuperAdminTab } from '@/components/settings/SuperAdminTab'

// ── Types ─────────────────────────────────────────────────────

type Tab = 'company' | 'team' | 'hr' | 'billing' | 'ai' | 'superadmin'

const TAB_ICONS: Record<Tab, string> = {
  company:    '🏢',
  team:       '◈',
  hr:         '📅',
  billing:    '🧾',
  ai:         '🤖',
  superadmin: '⬡',
}

const TAB_IDS: Tab[] = ['company', 'team', 'hr', 'billing', 'ai', 'superadmin']

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const t           = useTranslations('settings')
  const { user }    = useAuthContext()
  const router      = useRouter()
  const adminAccess = isAdmin(user?.role)
  const superAccess = isSuperAdmin(user?.role)

  const [activeTab, setActiveTab] = useState<Tab>('company')

  useEffect(() => {
    if (user && !adminAccess) router.push('/dashboard' as never)
  }, [user, adminAccess, router])

  if (!user || !adminAccess) return null

  const visibleTabs = TAB_IDS.filter(id => id !== 'superadmin' || superAccess)
  const ctaLabel    = activeTab === 'team' ? t('ctaNewTeam') : undefined

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} ctaLabel={ctaLabel} />

      <div className="app-content settings-layout">

        <div className="settings-tabs">
          {visibleTabs.map(id => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`settings-tab ${activeTab === id ? 'settings-tab--active' : ''}`}
            >
              <span>{TAB_ICONS[id]}</span>
              {t(`tabs.${id}`)}
            </button>
          ))}
        </div>

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