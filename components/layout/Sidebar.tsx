'use client'

import Link                from 'next/link'
import { usePathname }     from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useAuthContext }  from '@/components/layout/AuthProvider'
import { signOut }         from '@/lib/auth'
import { useRouter }       from '@/lib/navigation'
import { useEffect, useState } from 'react'
import { supabase }        from '@/lib/supabase'

export function Sidebar() {
  const pathname = usePathname()
  const locale   = useLocale()
  const t        = useTranslations('nav')
  const { user } = useAuthContext()
  const router   = useRouter()
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager'

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

  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      setPendingCount(count ?? 0)
    }
    fetchPending()

    const channel = supabase
      .channel('leave_requests_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leave_requests',
      }, () => fetchPending())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleLogout = async () => {
    await signOut()
    router.push('/login' as never)
  }

  const p = (path: string) => locale === 'en' ? path : `/${locale}${path}`

  const NAV = [
    {
      group: t('overview'),
      items: [
        { label: t('dashboard'), icon: '⬡', href: p('/dashboard') },
      ],
    },
    {
      group: t('team'),
      items: [
        { label: t('consultants'),    icon: '◈', href: p('/consultants') },
        { label: t('disponibilites'), icon: '◫', href: p('/availability') },
        { label: t('conges'),         icon: '◷', href: p('/leaves'), badge: (isAdminOrManager) && pendingCount > 0 ? pendingCount : undefined},
      ],
    },
    {
      group: t('projects'),
      items: [
        { label: t('projets'),  icon: '◧', href: p('/projects') },
        { label: t('clients'),  icon: '◉', href: p('/clients') },
        { label: t('timeline'), icon: '▤', href: p('/timeline') },
      ],
    },
    {
      group: t('admin'),
      items: [
        ...(user?.role === 'admin' ? [{ label: 'Finances', icon: '$', href: p('/financials') }] : []),
        { label: t('parametres'), icon: '◎', href: p('/settings') },
      ],
    },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="brand">staff<span>7</span></div>
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