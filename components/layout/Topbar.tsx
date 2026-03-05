'use client'

import { useTheme }        from './ThemeProvider'
import { LangSwitcher }    from './LangSwitcher'
import { useTranslations } from 'next-intl'
import { useAuthContext }  from './AuthProvider'

interface TopbarProps {
  title:      string
  breadcrumb: string
  ctaLabel?:  string
  onCta?:     () => void
}

export function Topbar({ title, breadcrumb, ctaLabel, onCta }: TopbarProps) {
  const { theme, toggle } = useTheme()
  const t = useTranslations('topbar')
  const { user, companyName } = useAuthContext()

  const isSuperAdmin = user?.role === 'super_admin'

  return (
    <div className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
        <span className="topbar-breadcrumb">{breadcrumb}</span>
      </div>

      <div className="topbar-actions">
        <input className="search-input" type="text" placeholder={t('search')} />

        {/* Tenant badge */}
        {companyName && (
          <div style={{
            display:       'flex',
            alignItems:    'center',
            gap:           6,
            padding:       '4px 10px',
            borderRadius:  3,
            border:        `1px solid ${isSuperAdmin ? 'rgba(0,229,255,0.3)' : 'var(--border)'}`,
            background:    isSuperAdmin ? 'rgba(0,229,255,0.06)' : 'var(--bg3)',
            fontSize:      10,
            letterSpacing: 1,
            fontWeight:    700,
            color:         isSuperAdmin ? 'var(--cyan)' : 'var(--text2)',
            textTransform: 'uppercase',
            whiteSpace:    'nowrap',
          }}>
            {isSuperAdmin && (
              <span style={{ fontSize: 8, opacity: 0.7 }}>⚡</span>
            )}
            {companyName}
          </div>
        )}

        <LangSwitcher />

        <button className="btn btn-ghost" onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {theme === 'dark' ? '☀ Light' : '☾ Dark'}
        </button>

        <button className="btn btn-ghost" disabled style={{ opacity: 0.35, cursor: 'not-allowed' }} title="// coming soon">{t('sync')}</button>

        {onCta && (
          <button className="btn btn-primary" onClick={onCta}>{ctaLabel ?? t('new')}</button>
        )}
      </div>
    </div>
  )
}