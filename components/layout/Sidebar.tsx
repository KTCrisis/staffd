'use client'

import Link                from 'next/link'
import { usePathname }     from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useAuthContext }  from '@/components/layout/AuthProvider'
import { signOut }         from '@/lib/auth'
import { useRouter }       from '@/lib/navigation'
import { useEffect, useState } from 'react'
import type React from 'react'
import { supabase }        from '@/lib/supabase'

// ── Type item nav ────────────────────────────────────────────
type NavItem = {
  label: string
  icon:  string
  href:  string
  badge?: number | React.ReactNode
  glow?: boolean
}

// ── Couleur accent par groupe ────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  overview:  'var(--text2)',
  team:      'var(--cyan)',
  activity:  'var(--green)',
  projects:  'var(--purple)',
  finance:   'var(--gold)',
  admin:     'var(--text2)',
  agents:    'var(--pink)',
}

export function Sidebar() {
  const pathname = usePathname()
  const locale   = useLocale()
  const t        = useTranslations('nav')
  const { user, companyMode } = useAuthContext()
  const isSolo = companyMode === 'solo'
  const router   = useRouter()

  const [collapsed, setCollapsed] = useState(false)
  const [command, setCommand]     = useState('')

  // ── Rôles ────────────────────────────────────────────────
  const isSuperAdmin     = user?.role === 'super_admin'
  const isAdmin          = user?.role === 'admin'
  const isManager        = user?.role === 'manager'
  const isConsultant     = user?.role === 'consultant'
  const isFreelance      = user?.role === 'freelance'
  const isAdminOrManager = isSuperAdmin || isAdmin || isManager
  const isConsultantOnly = isConsultant || isFreelance

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

  useEffect(() => {
    if (!isAdminOrManager) return
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
  // NAV
  // ══════════════════════════════════════════════════════════
  const NAV = [
    {
      group: t('overview'), key: 'overview',
      items: [
        { label: t('dashboard'), icon: '⬡', href: p('/dashboard') },
      ],
    },

    ...(!isSolo ? [{
      group: t('team'), key: 'team',
      items: [
        { label: t('consultants'), icon: '◈', href: p('/consultants') },
        ...(!isConsultantOnly ? [
          { label: t('disponibilites'), icon: '◫', href: p('/availability') },
        ] : []),
        ...(!isFreelance ? [{
          label: t('conges'), icon: '◷', href: p('/leaves'),
          badge: isAdminOrManager && pendingCount > 0 ? pendingCount : undefined,
        }] : []),
      ],
    }] : []),

    {
      group: t('activity'), key: 'activity',
      items: [
        { label: t('timesheets'), icon: '⏱', href: p('/timesheets') },
      ],
    },

    ...(!isConsultantOnly || isSolo ? [{
      group: t('projects'), key: 'projects',
      items: [
        { label: t('projets'),  icon: '◧', href: p('/projects') },
        { label: t('clients'),  icon: '◉', href: p('/clients')  },
        ...(!isSolo ? [
          { label: t('timeline'), icon: '▤', href: p('/timeline') },
        ] : []),
      ],
    }] : []),

    ...(isAdminOrManager || isSolo || isFreelance ? [{
      group: t('finance'), key: 'finance',
      items: [
        ...(isSuperAdmin || isAdmin || isSolo ? [
          { label: t('financials'),    icon: '$', href: p('/financials')    },
          { label: t('profitability'), icon: '◈', href: p('/profitability') },
        ] : []),
        { label: 'Invoices', icon: '◉', href: p('/invoices') },
      ],
    }] : []),

    ...((isSuperAdmin || isAdmin || isSolo) ? [{
      group: t('admin'), key: 'admin',
      items: [
        { label: t('parametres'), icon: '◎', href: p('/settings') },
      ],
    }] : []),

    ...(isSuperAdmin || isAdmin ? [{
      group: 'Agents', key: 'agents',
      items: [{
        label: 'Agentic AI', icon: '◬', href: p('/ai'),
        glow: true,
      } as NavItem],
    }] : []),
  ]

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <aside
      className="sidebar"
      style={{
        width:      collapsed ? 52 : undefined,
        minWidth:   collapsed ? 52 : undefined,
        overflow:   'hidden',
        transition: 'width 0.2s ease, min-width 0.2s ease',
      }}
    >
      {/* ── Logo + collapse toggle ── */}
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 8 }}>
        {!collapsed && (
          <div>
            <div className="brand">staff<span>7</span></div>
            <div className="sub">// AI-native PSA</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text2)', fontSize: 14, padding: '4px 6px',
            marginLeft: collapsed ? 'auto' : undefined,
            transition: 'color 0.2s',
            lineHeight: 1,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="sidebar-nav">
        {NAV.map(group => (
          <div key={group.key} className="nav-group">
            {/* Group label — masqué en mode collapsed */}
            {!collapsed && (
              <div
                className="nav-group-label"
                style={{ color: GROUP_COLORS[group.key] ?? 'var(--text2)' }}
              >
                {group.group}
              </div>
            )}
            {group.items.map(item => {
              const isActive = pathname.includes(item.href.replace(`/${locale}`, ''))
              const accent   = GROUP_COLORS[group.key] ?? 'var(--text2)'
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  style={isActive ? { color: accent, borderLeftColor: accent } : undefined}
                >
                  <span
                    className="nav-icon"
                    style={{ color: isActive ? accent : undefined }}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      {item.glow
                        ? <span className="nav-label-glow">{item.label}</span>
                        : item.label
                      }
                      {item.badge && <span className="nav-badge">{item.badge}</span>}
                    </>
                  )}
                  {collapsed && item.badge && typeof item.badge === 'number' && (
                    <span style={{
                      position: 'absolute', top: 4, right: 4,
                      background: 'var(--pink)', color: '#fff',
                      borderRadius: '50%', width: 14, height: 14,
                      fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Command bar AI ── */}
      {!collapsed && (isSuperAdmin || isAdmin) && (
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

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <div className="user-card" style={{ justifyContent: collapsed ? 'center' : undefined }}>
          <div className="avatar av-green" style={{ width: 32, height: 32, fontSize: 11, flexShrink: 0 }}>
            {initials}
          </div>
          {!collapsed && (
            <>
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
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes shimmer-ai {
          0%,100% { color: var(--text2); text-shadow: none; }
          40%     { color: var(--cyan);  text-shadow: 0 0 8px rgba(0,229,255,0.55); }
          70%     { color: var(--pink);  text-shadow: 0 0 8px rgba(255,45,107,0.45); }
        }
        .nav-label-glow {
          animation: shimmer-ai 3s ease-in-out infinite;
          font-weight: 600;
          letter-spacing: 0.3px;
        }
      `}</style>
    </aside>
  )
}