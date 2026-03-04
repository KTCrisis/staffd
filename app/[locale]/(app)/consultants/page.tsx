'use client'

import { useState }          from 'react'
import { useTranslations }   from 'next-intl'
import { useAuthContext }    from '@/components/layout/AuthProvider'
import { Topbar }            from '@/components/layout/Topbar'
import { Panel, StatRow }    from '@/components/ui'
import { Avatar }            from '@/components/ui/Avatar'
import { Badge }             from '@/components/ui/Badge'
import { ProgressBar }       from '@/components/ui/ProgressBar'
import { ConsultantTable }   from '@/components/consultants/ConsultantTable'
import { ConsultantForm }    from '@/components/consultants/ConsultantForm'
import { useConsultants, deleteConsultant } from '@/lib/data'
import type { ConsultantStatus, Consultant } from '@/types'

function Skeleton({ h = 80 }: { h?: number }) {
  return <div style={{ height: h, background: 'var(--bg3)', borderRadius: 4 }} />
}

export default function ConsultantsPage() {
  const t       = useTranslations('consultants')
  const tCommon = useTranslations('common')
  const { user } = useAuthContext()

  const [filter,        setFilter]        = useState<ConsultantStatus | 'all'>('all')
  const [search,        setSearch]        = useState('')
  const [selected,      setSelected]      = useState<Consultant | null>(null)
  const [showForm,      setShowForm]      = useState(false)
  const [editTarget,    setEditTarget]    = useState<Consultant | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [refresh,       setRefresh]       = useState(0)

  // ── Invite state ──────────────────────────────────────────
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteStatus,  setInviteStatus]  = useState<'idle' | 'sent' | 'already' | 'error'>('idle')

  const { data: consultants, loading } = useConsultants(refresh)

  const FILTERS: { label: string; value: ConsultantStatus | 'all' }[] = [
    { label: t('filters.all'),       value: 'all' },
    { label: t('filters.assigned'),  value: 'assigned' },
    { label: t('filters.available'), value: 'available' },
    { label: t('filters.leave'),     value: 'leave' },
    { label: t('filters.partial'),   value: 'partial' },
  ]

  const all = consultants ?? []

  const visible = all.filter((c: any) => {
    const matchFilter = filter === 'all' || c.status === filter
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
                     || c.role.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const stats = [
    { value: all.filter((c: any) => c.status === 'assigned').length,  label: t('filters.assigned'),  color: 'var(--cyan)' },
    { value: all.filter((c: any) => c.status === 'available').length, label: t('filters.available'), color: 'var(--green)' },
    { value: all.filter((c: any) => c.status === 'leave').length,     label: t('filters.leave'),     color: 'var(--gold)' },
    { value: all.filter((c: any) => c.status === 'partial').length,   label: t('filters.partial'),   color: 'var(--purple)' },
  ]

  const countLabel = `${visible.length} ${visible.length > 1 ? tCommon('consultants') : tCommon('consultant')}`

  const handleSaved = () => setRefresh(r => r + 1)

  const handleDelete = async () => {
    if (!selected) return
    setDeleting(true)
    try {
      await deleteConsultant(selected.id)
      setSelected(null)
      setConfirmDelete(false)
      setRefresh(r => r + 1)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleting(false)
    }
  }

  // ── Invite handler ─────────────────────────────────────────
  const handleInvite = async () => {
    if (!selected?.email) return
    setInviteLoading(true)
    setInviteStatus('idle')
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantId: selected.id,
          email:        selected.email,
          companyId: user?.companyId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setInviteStatus(json.alreadyExisted ? 'already' : 'sent')
      setRefresh(r => r + 1) // recharge pour afficher user_id à jour
    } catch {
      setInviteStatus('error')
    } finally {
      setInviteLoading(false)
    }
  }

  const closeDrawer = () => {
    setSelected(null)
    setConfirmDelete(false)
    setInviteStatus('idle')
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  return (
    <>
      <Topbar
        title={t('title')}
        breadcrumb={t('breadcrumb')}
        ctaLabel={t('cta')}
        onCta={() => setShowForm(true)}
      />

      <div className="app-content">

        <StatRow stats={stats} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {FILTERS.map((f: any) => (
            <button
              key={f.value}
              className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
          <input
            className="search-input"
            style={{ marginLeft: 'auto' }}
            placeholder={t('table.name') + '...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Panel title={countLabel} action={{ label: t('export'), onClick: () => {} }} noPadding>
          {loading
            ? <div style={{ padding: 18 }}><Skeleton h={200} /></div>
            : visible.length > 0
              ? <ConsultantTable consultants={visible} onSelect={c => { setSelected(c); setInviteStatus('idle') }} />
              : <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                  {t('noResults')}
                </div>
          }
        </Panel>

        {/* ── Drawer — fiche consultant ── */}
        {selected && (
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
            background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
            zIndex: 200, padding: 28, overflowY: 'auto',
            boxShadow: '-4px 0 20px var(--shadow)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
                {t('drawer.label')}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={closeDrawer}>
                {t('drawer.close')}
              </button>
            </div>

            {/* Avatar + nom */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <Avatar initials={selected.initials} color={selected.avatarColor} size="md" />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{selected.role}</div>
              </div>
            </div>

            {/* Données */}
            {[
              { label: t('drawer.status'),    value: <Badge variant={selected.status} /> },
              { label: t('drawer.project'),   value: selected.currentProject ?? '—' },
              { label: t('drawer.available'), value: selected.availableFrom ? new Date(selected.availableFrom).toLocaleDateString() : t('now') },
              { label: t('drawer.leaveDays'), value: `${selected.leaveDaysLeft} ${tCommon('days')}` },
              { label: t('drawer.occupancy'), value: `${selected.occupancyRate}%` },
            ].map((row: any) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 12,
              }}>
                <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}

            {/* Taux d'occupation */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>
                {t('drawer.rateLabel')}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{selected.occupancyRate}%</div>
              <ProgressBar value={selected.occupancyRate} style={{ height: 6 }} />
            </div>

            {/* ── Section accès compte (admin uniquement) ── */}
            {isAdmin && (
              <div style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 12 }}>
                  // account access
                </div>

                {(selected as any).user_id ? (
                  /* Compte déjà lié */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, color: 'var(--green)' }}>●</span>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>Account linked</div>
                      <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{selected.email}</div>
                    </div>
                  </div>
                ) : (
                  /* Pas encore de compte */
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 16, color: 'var(--text2)' }}>○</span>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>No account yet</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                          {selected.email ?? <span style={{ color: 'var(--pink)' }}>No email on file</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      className="btn btn-ghost"
                      style={{
                        width: '100%',
                        borderColor: 'var(--cyan)',
                        color: 'var(--cyan)',
                        opacity: (!selected.email || inviteLoading) ? 0.5 : 1,
                      }}
                      onClick={handleInvite}
                      disabled={!selected.email || inviteLoading}
                      title={!selected.email ? 'Add an email to this consultant first' : ''}
                    >
                      {inviteLoading ? '⏳ Sending...' : '✉ Send Invite'}
                    </button>

                    {inviteStatus === 'sent'    && <p style={{ fontSize: 11, color: 'var(--green)',  marginTop: 8 }}>✓ Invite sent to {selected.email}</p>}
                    {inviteStatus === 'already' && <p style={{ fontSize: 11, color: 'var(--gold)',   marginTop: 8 }}>⚠ Account existed — role updated</p>}
                    {inviteStatus === 'error'   && <p style={{ fontSize: 11, color: 'var(--pink)',   marginTop: 8 }}>✗ Error — check the email address</p>}
                  </>
                )}
              </div>
            )}

            {/* Boutons Edit / Delete */}
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <button
                className="btn btn-primary" style={{ flex: 1 }}
                onClick={() => { setEditTarget(selected); setSelected(null) }}
              >
                {t('drawer.edit')}
              </button>
              <button
                className="btn btn-ghost" style={{ flex: 1, color: 'var(--pink)' }}
                onClick={() => setConfirmDelete(true)}
              >
                ✕ Delete
              </button>
            </div>

            {/* Confirmation delete */}
            {confirmDelete && (
              <div style={{
                marginTop: 20, padding: '14px 16px',
                background: 'rgba(255,45,107,0.08)', border: '1px solid rgba(255,45,107,0.25)',
                borderRadius: 4,
              }}>
                <div style={{ fontSize: 11, color: 'var(--text)', marginBottom: 12 }}>
                  Remove <strong>{selected.name}</strong> permanently?
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-sm"
                    style={{ flex: 1, background: 'var(--pink)', color: '#fff', border: 'none' }}
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? '...' : '✕ Confirm'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formulaire création */}
        {showForm && (
          <ConsultantForm
            onClose={() => setShowForm(false)}
            onSaved={handleSaved}
          />
        )}

        {/* Formulaire édition */}
        {editTarget && (
          <ConsultantForm
            consultant={editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={handleSaved}
          />
        )}

      </div>
    </>
  )
}