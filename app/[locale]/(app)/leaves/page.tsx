'use client'

import { useState }        from 'react'
import { useTranslations } from 'next-intl'
import { useAuthContext }  from '@/components/layout/AuthProvider'
import { isAdmin, canEdit } from '@/lib/auth'
import { Topbar }          from '@/components/layout/Topbar'
import { Panel, StatRow }  from '@/components/ui'
import { LeaveRequestCard }  from '@/components/leaves/LeaveRequestCard'
import { LeaveSolde }        from '@/components/leaves/LeaveSolde'
import { LeaveRequestForm }  from '@/components/leaves/LeaveRequestForm'
import { useLeaveRequests, useConsultants, approveLeave, refuseLeave } from '@/lib/data'
import type { LeaveRequest, LeaveStatus } from '@/types'

function Skeleton({ h = 80 }: { h?: number }) {
  return <div style={{ height: h, background: 'var(--bg3)', borderRadius: 4 }} />
}

export default function LeavesPage() {
  const t        = useTranslations('conges')
  const { user } = useAuthContext()

  // ── Guards rôle ────────────────────────────────────────────
  const adminAccess = isAdmin(user?.role)    // admin + super_admin
  const editAccess  = canEdit(user?.role)    // admin + manager
  // Tous les rôles authentifiés peuvent soumettre une demande de congé
  const canRequest  = !!user

  // ── Filtre actif — défaut sur 'pending' pour admin/manager ─
  const [filter,   setFilter]   = useState<LeaveStatus | 'all'>(editAccess ? 'pending' : 'all')
  const [showForm, setShowForm] = useState(false)
  const [refresh,  setRefresh]  = useState(0)

  const { data: requests,    loading: lreq   } = useLeaveRequests(refresh)
  const { data: consultants, loading: lcons  } = useConsultants(refresh)

  const FILTERS: { label: string; value: LeaveStatus | 'all' }[] = [
    { label: t('filters.all'),      value: 'all' },
    { label: t('filters.pending'),  value: 'pending' },
    { label: t('filters.approved'), value: 'approved' },
    { label: t('filters.refused'),  value: 'refused' },
  ]

  const all = (requests ?? []) as LeaveRequest[]

  // Consultant ne voit que ses propres demandes
  const scoped = editAccess
    ? all
    : all.filter(r => r.consultantId === user?.id)

  const visible  = scoped.filter(r => filter === 'all' || r.status === filter)
  const pending  = scoped.filter(r => r.status === 'pending').length
  const approved = scoped.filter(r => r.status === 'approved').length
  const refused  = scoped.filter(r => r.status === 'refused').length
  const totalDays = scoped.reduce((s, r) => s + (r.days ?? 0), 0)

  const stats = [
    { value: pending,   label: t('stats.pending'),   color: 'var(--gold)' },
    { value: approved,  label: t('stats.approved'),  color: 'var(--green)' },
    { value: refused,   label: t('stats.refused'),   color: 'var(--pink)' },
    { value: totalDays, label: t('stats.totalDays'), color: 'var(--text2)' },
  ]

  const handleApprove = async (id: string) => {
    await approveLeave(id)
    setRefresh(r => r + 1)
  }

  const handleRefuse = async (id: string) => {
    await refuseLeave(id)
    setRefresh(r => r + 1)
  }

  const handleSaved = () => setRefresh(r => r + 1)

  return (
    <>
      <Topbar
        title={t('title')}
        breadcrumb={t('breadcrumb')}
        /* Tous les utilisateurs connectés peuvent soumettre une demande */
        ctaLabel={canRequest ? t('cta') : undefined}
        onCta={canRequest ? () => setShowForm(true) : undefined}
      />

      <div className="app-content">

        <StatRow stats={stats} />

        {/* ── Filtres ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              {f.value === 'pending' && pending > 0 && (
                <span style={{
                  marginLeft: 6,
                  background: 'var(--pink)',
                  color: 'var(--bg)',   // ← var(--bg) au lieu de '#fff'
                  borderRadius: 10,
                  padding: '0 5px',
                  fontSize: 9,
                }}>
                  {pending}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="two-col">

          {/* ── Liste des demandes ── */}
          <Panel
            title={t('requests')}
            action={editAccess && pending > 0
              ? { label: `⚠ ${pending} ${t('toValidate')}`, onClick: () => setFilter('pending') }
              : undefined
            }
          >
            {lreq ? (
              <Skeleton h={200} />
            ) : visible.length > 0 ? (
              <>
                {visible.map(r => (
                  <LeaveRequestCard
                    key={r.id}
                    request={r}
                    // Approve/refuse — editAccess uniquement
                    onApprove={editAccess ? handleApprove : undefined}
                    onRefuse={editAccess  ? handleRefuse  : undefined}
                  />
                ))}
                {/* Indication pagination future si beaucoup de résultats */}
                {visible.length >= 20 && (
                  <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 10, color: 'var(--text2)' }}>
                    // {visible.length} résultats — filtrez par statut ou période pour affiner
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                {t('noRequests')}
              </div>
            )}
          </Panel>

          {/* ── Soldes ── */}
          <Panel title={t('soldes')}>
            {lcons ? (
              <Skeleton h={200} />
            ) : (
              <LeaveSolde
                consultants={consultants ?? []}
                currentUserId={user?.id}
                // consultant voit uniquement le sien, admin/manager voient tous
                isConsultant={!editAccess}
              />
            )}
          </Panel>

        </div>

      </div>

      {/* Formulaire — tous les rôles */}
      {showForm && (
        <LeaveRequestForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}