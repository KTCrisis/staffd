'use client'

import Link                from 'next/link'
import { usePathname }     from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useAuthContext }  from '@/components/layout/AuthProvider'
import { isAdmin, isManager, canEdit, canViewFinancials } from '@/lib/auth'
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

  // ── Guards rôle ──────────────────────────────────────────
  const adminAccess     = isAdmin(user?.role)
  const editAccess      = canEdit(user?.role)       // admin + manager
  const financialAccess = canViewFinancials(user?.role)
  const isConsultant    = user?.role === 'consultant'

  const roleLabel =
    user?.role === 'super_admin' ? 'Super Admin' :
    user?.role === 'admin'       ? 'Admin' :
    user?.role === 'manager'     ? 'Manager' :
    user?.role === 'consultant'  ? 'Consultant' : 'Viewer'

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '??'

  // ── Badge congés pending ─────────────────────────────────
  const [pendingCount, setPendingCount] = useState(0)
  const [command,      setCommand]      = useState('')

  useEffect(() => {
    if (!editAccess) return
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, fetchPending)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [editAccess])

  const handleLogout = async () => {
    await signOut()
    router.push('/login' as never)
  }

  const p = (path: string) => locale === 'en' ? path : `/${locale}${path}`

  const isActive = (href: string) =>
    pathname.includes(href.replace(`/${locale}`, ''))

  // ══════════════════════════════════════════════════════════
  // NAV STRUCTURE
  // ══════════════════════════════════════════════════════════

  const NAV = [

    // ── OVERVIEW — tous les rôles ──────────────────────────
    {
      group: t('overview'),
      items: [
        { label: t('dashboard'), icon: '⬡', href: p('/dashboard') },
      ],
    },

    // ── ÉQUIPE — tous les rôles ────────────────────────────
    {
      group: t('team'),
      items: [
        { label: t('consultants'),   icon: '◈', href: p('/consultants') },
        ...(editAccess ? [
          { label: t('disponibilites'), icon: '◫', href: p('/availability') },
        ] : []),
        {
          label: t('conges'),
          icon:  '◷',
          href:  p('/leaves'),
          badge: editAccess && pendingCount > 0 ? pendingCount : undefined,
        },
        { label: t('timesheets'), icon: '⏱', href: p('/timesheets') },
      ],
    },

    // ── BUSINESS — admin + manager ─────────────────────────
    ...(editAccess ? [{
      group: t('business'),
      items: [
        { label: t('clients'),        icon: '◉', href: p('/clients') },
        { label: t('projets'),        icon: '◧', href: p('/projects') },
        { label: t('appelsOffres'),   icon: '◌', href: p('/bids') },
        { label: t('timeline'),       icon: '▤', href: p('/timeline') },
      ],
    }] : []),

    // ── FINANCE — admin uniquement ─────────────────────────
    ...(financialAccess ? [{
      group: t('finance'),
      items: [
        { label: t('financials'),     icon: '$', href: p('/financials') },
        { label: t('profitability'),  icon: '◎', href: p('/profitability') },
      ],
    }] : []),

    // ── ADMIN — admin uniquement ───────────────────────────
    ...(adminAccess ? [{
      group: t('admin'),
      items: [
        { label: t('parametres'),     icon: '◎', href: p('/settings') },
        {
          label: t('agents'),
          icon:  '⚡',
          href:  p('/ai'),
          badge: <span style={{ color: 'var(--pink)', fontSize: 8 }}>BETA</span>,
        },
      ],
    }] : []),

  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="brand">staff<span>7</span></div>
        <div className="sub">// {roleLabel.toLowerCase()}</div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(group => (
          <div key={group.group} className="nav-group">
            <div className="nav-group-label">{group.group}</div>
            {group.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Command bar AI ── */}
      {editAccess && (
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <div style={{
            background: 'rgba(255,45,107,0.05)',
            border: '1px solid rgba(255,45,107,0.2)',
            borderRadius: 4, padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: 'var(--pink)', fontSize: 10, fontWeight: 'bold' }}>&gt;_</span>
            <input
              value={command}
              onChange={e => setCommand(e.target.value)}
              placeholder="Ask agent..."
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 11, width: '100%',
                fontFamily: 'var(--font)',
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  router.push(`${p('/ai')}?q=${encodeURIComponent(command)}` as any)
                  setCommand('')
                }
              }}
            />
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="avatar av-green" style={{ width: 32, height: 32, fontSize: 11 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name" style={{
              overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', maxWidth: 110,
            }}>
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