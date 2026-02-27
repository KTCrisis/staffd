'use client'

import Link                from 'next/link'
import { usePathname }     from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'

export function Sidebar() {
  const pathname = usePathname()
  const locale   = useLocale()
  const t        = useTranslations('nav')

  // Préfixe selon la locale (fr = pas de préfixe, en = /en)
  const p = (path: string) => locale === 'fr' ? path : `/${locale}${path}`

  const NAV = [
    {
      group: t('overview'),
      items: [{ label: t('dashboard'), icon: '⬡', href: p('/dashboard') }],
    },
    {
      group: t('team'),
      items: [
        { label: t('consultants'),    icon: '◈', href: p('/consultants') },
        { label: t('disponibilites'), icon: '◫', href: p('/disponibilites') },
        { label: t('conges'),         icon: '◷', href: p('/conges'), badge: 3 },
      ],
    },
    {
      group: t('projects'),
      items: [
        { label: t('projets'),  icon: '◧', href: p('/projets') },
        { label: t('timeline'), icon: '▤', href: p('/timeline') },
      ],
    },
    {
      group: t('admin'),
      items: [{ label: t('parametres'), icon: '◎', href: p('/parametres') }],
    },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="brand">staff<span>d</span></div>
        <div className="sub">// consultant manager</div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(group => (
          <div key={group.group} className="nav-group">
            <div className="nav-group-label">{group.group}</div>
            {group.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname.includes(item.href.replace(`/${locale}`, '')) ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="avatar av-green" style={{ width: 32, height: 32, fontSize: 11 }}>KT</div>
          <div>
            <div className="user-name">KTCrisis</div>
            <div className="user-role">Admin · Manager</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
