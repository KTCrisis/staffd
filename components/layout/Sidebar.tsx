'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    group: 'Vue d\'ensemble',
    items: [{ label: 'Dashboard', icon: '⬡', href: '/dashboard' }],
  },
  {
    group: 'Équipe',
    items: [
      { label: 'Consultants',    icon: '◈', href: '/consultants' },
      { label: 'Disponibilités', icon: '◫', href: '/disponibilites' },
      { label: 'Congés',         icon: '◷', href: '/conges', badge: 3 },
    ],
  },
  {
    group: 'Projets',
    items: [
      { label: 'Projets',  icon: '◧', href: '/projets' },
      { label: 'Timeline', icon: '▤', href: '/timeline' },
    ],
  },
  {
    group: 'Admin',
    items: [{ label: 'Paramètres', icon: '◎', href: '/parametres' }],
  },
]

export function Sidebar() {
  const pathname = usePathname()

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
                className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
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
