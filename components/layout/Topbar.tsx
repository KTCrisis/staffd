'use client'

import { useTheme } from './ThemeProvider'

interface TopbarProps {
  title: string
  breadcrumb: string
  ctaLabel?: string
  onCta?: () => void
}

export function Topbar({ title, breadcrumb, ctaLabel = '+ Nouveau', onCta }: TopbarProps) {
  const { theme, toggle } = useTheme()

  return (
    <div className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
        <span className="topbar-breadcrumb">{breadcrumb}</span>
      </div>
      <div className="topbar-actions">
        <input className="search-input" type="text" placeholder="Rechercher..." />
        <button className="theme-toggle btn btn-ghost" onClick={toggle} style={{ gap: 6, display: 'flex', alignItems: 'center' }}>
          {theme === 'dark' ? '☀ Light' : '☾ Dark'}
        </button>
        <button className="btn btn-ghost">↻ Sync</button>
        {onCta && (
          <button className="btn btn-primary" onClick={onCta}>{ctaLabel}</button>
        )}
      </div>
    </div>
  )
}
