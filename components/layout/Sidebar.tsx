'use client'

import Link                from 'next/link'
import { usePathname }     from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useAuthContext }  from '@/components/layout/AuthProvider'
import { signOut }         from '@/lib/auth'
import { useRouter }       from '@/lib/navigation'

export function Sidebar() {
  const pathname = usePathname()
  const locale   = useLocale()
  const t        = useTranslations('nav')
  const { user } = useAuthContext()
  const router   = useRouter()

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '??'

  const roleLabel = user?.role === 'admin'
    ? 'Admin'
    : user?.role === 'manager'
    ? 'Manager'
    : user?.role === 'consultant'
    ? 'Consultant'
    : 'Viewer'

  const handleLogout = async () => {
    await signOut()
    router.push('/login' as never)
  }

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
          <div className="avatar av-green" style={{ width: 32, height: 32, fontSize: 11 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
              {user?.email ?? '—'}
            </div>
            <div className="user-role">{roleLabel}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Déconnexion"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text2)', fontSize: 14, padding: '2px 4px',
              flexShrink: 0, transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--pink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  )
}