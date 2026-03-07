'use client'

import { useTheme }        from './ThemeProvider'
import { LangSwitcher }    from './LangSwitcher'
import { OrgSwitcher }     from './OrgSwitcher'
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

        {/* Tenant badge — OrgSwitcher pour super_admin, badge statique pour les autres */}
        {isSuperAdmin
          ? <OrgSwitcher />
          : companyName && (
              <div style={{
                display:       'flex',
                alignItems:    'center',
                gap:           6,
                padding:       '4px 10px',
                borderRadius:  3,
                border:        '1px solid var(--border)',
                background:    'var(--bg3)',
                fontSize:      10,
                letterSpacing: 1,
                fontWeight:    700,
                color:         'var(--text2)',
                textTransform: 'uppercase',
                whiteSpace:    'nowrap',
              }}>
                {companyName}
              </div>
            )
        }

        <LangSwitcher />

        <button className="btn btn-ghost" onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {theme === 'dark' ? t('themeLight') : t('themeDark')}
        </button>

        {onCta && (
          <button className="btn btn-primary" onClick={onCta}>{ctaLabel ?? t('new')}</button>
        )}
      </div>
    </div>
  )
}