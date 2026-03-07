// components/settings/SettingsClient.tsx
'use client'

import { useState }        from 'react'
import { useTranslations } from 'next-intl'
import { CompanyTab }      from '@/components/settings/CompanyTab'
import { TeamTab }         from '@/components/settings/TeamTab'
import { HRTab }           from '@/components/settings/HRTab'
import { BillingTab }      from '@/components/settings/BillingTab'
import { AITab }           from '@/components/settings/AITab'
import { SuperAdminTab }   from '@/components/settings/SuperAdminTab'

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

interface Props {
  userRole?:    string
  companyId:    string
  isSuperAdmin: boolean
}

export function SettingsClient({ userRole, companyId, isSuperAdmin }: Props) {
  const t = useTranslations('settings')
  const [activeTab, setActiveTab] = useState<Tab>('company')

  const visibleTabs = TAB_IDS.filter(id => id !== 'superadmin' || isSuperAdmin)

  return (
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
      {activeTab === 'team'       && <TeamTab companyId={companyId} />}
      {activeTab === 'hr'         && <HRTab />}
      {activeTab === 'billing'    && <BillingTab />}
      {activeTab === 'ai'         && <AITab />}
      {activeTab === 'superadmin' && isSuperAdmin && <SuperAdminTab />}

    </div>
  )
}