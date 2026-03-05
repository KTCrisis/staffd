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

  // ── Rôles ────────────────────────────────────────────────
  const isSuperAdmin     = user?.role === 'super_admin'
  const isAdmin          = user?.role === 'admin'
  const isManager        = user?.role === 'manager'
  const isConsultant     = user?.role === 'consultant'
  const isFreelance      = user?.role === 'freelance'
  const isAdminOrManager = isSuperAdmin || isAdmin || isManager
  const isConsultantOnly = isConsultant || isFreelance   // pure leaf roles

  const roleLabel =
    isSuperAdmin ? 'Super Admin' :
    isAdmin      ? 'Admin' :
    isManager    ? 'Manager' :
    isFreelance  ? 'Freelance' :
    isConsultant ? 'Consultant' : 'Viewer'

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '??'

  // ── Badge congés pending ─────────────────────────────────
  const [pendingCount, setPendingCount] = useState(0)
  const [command, setCommand] = useState('')

  useEffect(() => {
    if (!isAdminOrManager) return  // consultant ne voit pas le badge
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
  }, [isAdminOrManager])

  const handleLogout = async () => {
    await signOut()
    router.push('/login' as never)
  }

  const p = (path: string) => locale === 'en' ? path : `/${locale}${path}`

  // ══════════════════════════════════════════════════════════
  // NAV — filtrée par rôle
  // ══════════════════════════════════════════════════════════

  const NAV = [
    // ── Overview (tous les rôles) ──
    {
      group: t('overview'),
      items: [
        { label: t('dashboard'), icon: '⬡', href: p('/dashboard') },
      ],
    },

    // ── Team ──────────────────────────────────────────────
    {
      group: t('team'),
      items: [
        // Consultants : visible par tous (pour le consultant/freelance = sa fiche)
        { label: t('consultants'), icon: '◈', href: p('/consultants') },

        // Availability : admin/manager uniquement
        ...(!isConsultantOnly ? [
          { label: t('disponibilites'), icon: '◫', href: p('/availability') },
        ] : []),

        // Congés : tout le monde sauf freelance (pas de CP/RTT)
        ...(!isFreelance ? [{
          label:  t('conges'),
          icon:   '◷',
          href:   p('/leaves'),
          badge:  isAdminOrManager && pendingCount > 0 ? pendingCount : undefined,
        }] : []),
      ],
    },

    // ── Activity (tous les rôles) ──
    {
      group: t('activity'),
      items: [
        { label: t('timesheets'), icon: '⏱', href: p('/timesheets') },
      ],
    },

    // ── Billing : admin/manager/freelance ──
    ...(isAdminOrManager || isFreelance ? [{
      group: 'Billing',
      items: [
        {
          label: 'Invoices',
          icon:  '◉',
          href:  p('/invoices'),
        },
      ],
    }] : []),

    // ── Projects : admin/manager uniquement ──
    ...(!isConsultantOnly ? [{
      group: t('projects'),
      items: [
        { label: t('projets'),  icon: '◧', href: p('/projects') },
        { label: t('clients'),  icon: '◉', href: p('/clients') },
        { label: t('timeline'), icon: '▤', href: p('/timeline') },
      ],
    }] : []),

    // ── Admin : admin/manager + super_admin ──
    ...(isAdminOrManager ? [{
      group: t('admin'),
      items: [
        { label: 'Finances',     icon: '$', href: p('/financials') },
        { label: t('parametres'),icon: '◎', href: p('/settings') },
      ],
    }] : []),

    // ── Agents AI : admin/manager + super_admin ──
    ...(isAdminOrManager ? [{
      group: 'Agents',
      items: [
        {
          label: 'Agentic AI',
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
        <div className="sub">// AI-native PSA</div>
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

      {/* ── Command bar AI (admin/manager uniquement) ── */}
      {isAdminOrManager && (
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
                color: '#fff', fontSize: 11, width: '100%',
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