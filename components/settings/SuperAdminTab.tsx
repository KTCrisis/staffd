'use client'

// ══════════════════════════════════════════════════════════════
// components/settings/SuperAdminTab.tsx
// ══════════════════════════════════════════════════════════════

import { SectionLabel, ComingSoon } from './shared'

export function SuperAdminTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{
        padding: '8px 14px', borderRadius: 4,
        background: 'rgba(255,45,107,0.06)', border: '1px solid rgba(255,45,107,0.2)',
        fontSize: 10, color: 'var(--pink)', letterSpacing: 1,
      }}>
        ⬡ Super Admin — cross-tenant access
      </div>

      <SectionLabel label="TENANTS" />
      <ComingSoon label="tenant_management" />

      <SectionLabel label="PLATFORM_STATS" />
      <ComingSoon label="platform_stats" />
    </div>
  )
}