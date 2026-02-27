'use client'

import { useTheme }        from './ThemeProvider'
import { LangSwitcher }    from './LangSwitcher'
import { useTranslations } from 'next-intl'

interface TopbarProps {
  title:      string
  breadcrumb: string
  ctaLabel?:  string
  onCta?:     () => void
}

export function Topbar({ title, breadcrumb, ctaLabel, onCta }: TopbarProps) {
  const { theme, toggle } = useTheme()
  const t = useTranslations('topbar')

  return (
    <div className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
        <span className="topbar-breadcrumb">{breadcrumb}</span>
      </div>

      <div className="topbar-actions">
        <input className="search-input" type="text" placeholder={t('search')} />

        <LangSwitcher />

        <button className="btn btn-ghost" onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {theme === 'dark' ? '☀ Light' : '☾ Dark'}
        </button>

        <button className="btn btn-ghost">{t('sync')}</button>

        {onCta && (
          <button className="btn btn-primary" onClick={onCta}>{ctaLabel ?? t('new')}</button>
        )}
      </div>
    </div>
  )
}
