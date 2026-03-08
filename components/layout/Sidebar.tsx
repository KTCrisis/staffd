// components/layout/Sidebar.tsx
'use client'

import Link               from 'next/link'
import { usePathname }    from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { signOut }        from '@/lib/auth'
import { useRouter }      from '@/lib/navigation'
import { useEffect, useState } from 'react'
import type React from 'react'
import { supabase }       from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────

type NavItem = {
  label: string
  icon:  string
  href:  string
  badge?: number | React.ReactNode
  glow?: boolean
}

const GROUP_COLORS: Record<string, string> = {
  team:     'var(--cyan)',
  projects: 'var(--purple)',
  finance:  'var(--gold)',
  agents:   'var(--pink)',
}

// ── Props ─────────────────────────────────────────────────────

interface SidebarProps {
  userRole:    string
  userEmail:   string
  companyMode: 'solo' | 'team' | null
}

// ── Composant ─────────────────────────────────────────────────

export function Sidebar({ userRole, userEmail, companyMode }: SidebarProps) {
  const pathname = usePathname()
  const locale   = useLocale()
  const t        = useTranslations('nav')
  const router   = useRouter()

  const isSolo = companyMode === 'solo'

  const [collapsed, setCollapsed] = useState(false)
  const [command,   setCommand]   = useState('')

  // ── Rôles ────────────────────────────────────────────────
  const isSuperAdmin     = userRole === 'super_admin'
  const isAdmin          = userRole === 'admin'
  const isManager        = userRole === 'manager'
  const isConsultant     = userRole === 'consultant'
  const isFreelance      = userRole === 'freelance'
  const isAdminOrManager = isSuperAdmin || isAdmin || isManager
  const isConsultantOnly = isConsultant || isFreelance

  const roleLabel =
    isSuperAdmin ? 'Super Admin' :
    isAdmin      ? 'Admin'       :
    isManager    ? 'Manager'     :
    isFreelance  ? 'Freelance'   :
    isConsultant ? 'Consultant'  : 'Viewer'

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : '??'

  // ── Badge congés pending (realtime) ──────────────────────
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

  // ── Nav ───────────────────────────────────────────────────
  const NAV = [

    // ── Dashboard seul, sans label de groupe ─────────────────
    {
      group: '', key: 'overview',
      items: [{ label: t('dashboard'), icon: '⬡', href: p('/dashboard') }],
    },

    // ── Équipe + Activité fusionnés ───────────────────────────
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
        { label: t('timesheets'), icon: '⏱', href: p('/timesheets') },
      ],
    }] : [
      // mode solo : juste CRAs
      {
        group: t('activity'), key: 'team',
        items: [{ label: t('timesheets'), icon: '⏱', href: p('/timesheets') }],
      },
    ]),

    // ── Projets ───────────────────────────────────────────────
    ...(!isConsultantOnly || isSolo ? [{
      group: t('projects'), key: 'projects',
      items: [
        { label: t('projets'),      icon: '◧', href: p('/projects') },
        { label: t('clients'),      icon: '◉', href: p('/clients')  },
        { label: t('appelsOffres'), icon: '◬', href: p('/bids')     },
        ...(!isSolo ? [{ label: t('timeline'), icon: '▤', href: p('/timeline') }] : []),
      ],
    }] : []),

    // ── Finance — managers exclus ─────────────────────────────
    ...(isSuperAdmin || isAdmin || isSolo || isFreelance ? [{
      group: t('finance'), key: 'finance',
      items: [
        ...(isSuperAdmin || isAdmin || isSolo ? [
          { label: t('financials'),    icon: '$', href: p('/financials')    },
          { label: t('profitability'), icon: '◈', href: p('/profitability') },
        ] : []),
        { label: t('invoices'), icon: '◉', href: p('/invoices') },
      ],
    }] : []),

    // ── Admin + Agents ────────────────────────────────────────
    ...(isSuperAdmin || isAdmin || isSolo ? [{
      group: t('admin'), key: 'agents',
      items: [
        { label: t('parametres'), icon: '◎', href: p('/settings') },
        ...(isSuperAdmin || isAdmin ? [
          { label: t('agenticAI'), icon: '◬', href: p('/ai'), glow: true } as NavItem,
        ] : []),
      ],
    }] : []),
  ]

  // ── Render ────────────────────────────────────────────────
  return (
    <aside
      className="sidebar"
      style={{
        width: collapsed ? 52 : undefined, minWidth: collapsed ? 52 : undefined,
        overflow: 'hidden', transition: 'width 0.2s ease, min-width 0.2s ease',
      }}
    >
      {/* Logo + collapse */}
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 8 }}>
        {!collapsed && (
          <div>
            <div className="brand">staff<span>7</span></div>
            <div className="sub">// AI-native PSA</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? t('expand') : t('collapse')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text2)', fontSize: 14, padding: '4px 6px',
            marginLeft: collapsed ? 'auto' : undefined,
            transition: 'color 0.2s', lineHeight: 1,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(group => (
          <div key={group.key} className="nav-group">
            {!collapsed && group.group && (
              <div className="nav-group-label" style={{ color: GROUP_COLORS[group.key] ?? 'var(--text2)' }}>
                {group.group}
              </div>
            )}
            {group.items.map(item => {
              const isActive = pathname.includes(item.href.replace(`/${locale}`, ''))
              const accent   = GROUP_COLORS[group.key] ?? 'var(--green)'
              return (
                <Link key={item.href} href={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  style={isActive ? { color: accent, borderLeftColor: accent } : undefined}
                >
                  <span className="nav-icon" style={{ color: isActive ? accent : undefined }}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      {item.glow
                        ? <span className="nav-label-glow">{item.label}</span>
                        : item.label}
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

      {/* Command bar AI */}
      {!collapsed && (isSuperAdmin || isAdmin) && (
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <div style={{
            background: 'rgba(255,45,107,0.05)', border: '1px solid rgba(255,45,107,0.2)',
            borderRadius: 4, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: 'var(--pink)', fontSize: 10, fontWeight: 'bold' }}>&gt;_</span>
            <input
              value={command}
              onChange={e => setCommand(e.target.value)}
              placeholder={t('askAgent')}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: '#fff', fontSize: 11, width: '100%', fontFamily: 'var(--font)',
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

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-card" style={{ justifyContent: collapsed ? 'center' : undefined }}>
          <div className="avatar av-green" style={{ width: 32, height: 32, fontSize: 11, flexShrink: 0 }}>
            {initials}
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
                  {userEmail}
                </div>
                <div className="user-role">{roleLabel}</div>
              </div>
              <button
                onClick={handleLogout}
                title={t('logout')}
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
          font-weight: 600; letter-spacing: 0.3px;
        }
      `}</style>
    </aside>
  )
}