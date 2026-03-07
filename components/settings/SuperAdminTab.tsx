'use client'

// ══════════════════════════════════════════════════════════════
// components/settings/SuperAdminTab.tsx
// ══════════════════════════════════════════════════════════════

import { useTranslations } from 'next-intl'
import { SectionLabel, ComingSoon } from './shared'

export function SuperAdminTab() {
  const t = useTranslations('settings.superAdmin')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{
        padding: '8px 14px', borderRadius: 4,
        background: 'rgba(255,45,107,0.06)', border: '1px solid rgba(255,45,107,0.2)',
        fontSize: 10, color: 'var(--pink)', letterSpacing: 1,
      }}>
        {t('badge')}
      </div>

      <SectionLabel label={t('tenantsSection')} />
      <ComingSoon label={t('tenantsMgmt')} />

      <SectionLabel label={t('statsSection')} />
      <ComingSoon label={t('statsMgmt')} />
    </div>
  )
}