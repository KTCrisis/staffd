'use client'

import { useState }          from 'react'
import { useTranslations }   from 'next-intl'
import { useAuthContext }    from '@/components/layout/AuthProvider'
import { isAdmin, canEdit, canViewFinancials } from '@/lib/auth'
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

  // ── Guards rôle — helpers centralisés de lib/auth.ts ───────
  const adminAccess     = isAdmin(user?.role)           // super_admin + admin
  const editAccess      = canEdit(user?.role)           // super_admin + admin + manager
  const financialAccess = canViewFinancials(user?.role) // super_admin + admin

  const [filter,        setFilter]        = useState<ConsultantStatus | 'all'>('all')
  const [search,        setSearch]        = useState('')
  const [selected,      setSelected]      = useState<Consultant | null>(null)
  const [showForm,      setShowForm]      = useState(false)
  const [editTarget,    setEditTarget]    = useState<Consultant | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [refresh,       setRefresh]       = useState(0)

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

  const visible = all.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
                     || c.role.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const stats = [
    { value: all.filter(c => c.status === 'assigned').length,  label: t('filters.assigned'),  color: 'var(--cyan)' },
    { value: all.filter(c => c.status === 'available').length, label: t('filters.available'), color: 'var(--green)' },
    { value: all.filter(c => c.status === 'leave').length,     label: t('filters.leave'),     color: 'var(--gold)' },
    { value: all.filter(c => c.status === 'partial').length,   label: t('filters.partial'),   color: 'var(--purple)' },
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
          companyId:    user?.companyId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setInviteStatus(json.alreadyExisted ? 'already' : 'sent')
      setRefresh(r => r + 1)
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

  return (
    <>
      <Topbar
        title={t('title')}
        breadcrumb={t('breadcrumb')}
        ctaLabel={editAccess ? t('cta') : undefined}
        onCta={editAccess ? () => setShowForm(true) : undefined}
      />

      <div className="app-content">

        <StatRow stats={stats} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
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

        <Panel title={countLabel} noPadding>
          {loading
            ? <div style={{ padding: 18 }}><Skeleton h={200} /></div>
            : visible.length > 0
              ? <ConsultantTable
                  consultants={visible}
                  onSelect={c => { setSelected(c); setInviteStatus('idle') }}
                />
              : <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                  {t('noResults')}
                </div>
          }
        </Panel>

        {/* ── Overlay + Drawer ── */}
        {selected && (
          <>
            <div
              onClick={closeDrawer}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 199 }}
            />

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
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                    {selected.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{selected.role}</div>
                  {selected.email && (
                    <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{selected.email}</div>
                  )}
                </div>
              </div>

              {/* Données */}
              {[
                { label: t('drawer.status'),    value: <Badge variant={selected.status} /> },
                { label: t('drawer.project'),   value: selected.currentProject ?? '—' },
                { label: t('drawer.available'), value: selected.availableFrom
                    ? new Date(selected.availableFrom).toLocaleDateString('fr-FR')
                    : t('now') },
                { label: t('drawer.leaveDays'), value: `${selected.leaveDaysLeft} ${tCommon('days')}` },
                { label: t('drawer.occupancy'), value: `${selected.occupancyRate}%` },
                // TJM — financialAccess uniquement (admin + super_admin)
                ...(financialAccess && selected.tjm
                  ? [{ label: 'TJM', value: `${selected.tjm} €/j` }]
                  : []),
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 12,
                }}>
                  <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}

              {/* Stack */}
              {selected.stack && selected.stack.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>
                    Stack
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selected.stack.map(s => (
                      <span key={s} style={{
                        fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: 2,
                        background: 'var(--bg3)', border: '1px solid var(--border)',
                        color: 'var(--text2)',
                      }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Taux d'occupation */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>
                  {t('drawer.rateLabel')}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  {selected.occupancyRate}%
                </div>
                <ProgressBar value={selected.occupancyRate} style={{ height: 6 }} />
              </div>

              {/* ── Accès compte — adminAccess uniquement ── */}
              {adminAccess && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 12 }}>
                    // account access
                  </div>

                  {selected.user_id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, color: 'var(--green)' }}>●</span>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>Compte lié</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{selected.email}</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 16, color: 'var(--text2)' }}>○</span>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text2)' }}>Aucun compte</div>
                          <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                            {selected.email
                              ? selected.email
                              : <span style={{ color: 'var(--pink)' }}>Email manquant</span>
                            }
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
                      >
                        {inviteLoading ? '⏳ Envoi...' : '✉ Envoyer une invitation'}
                      </button>

                      {inviteStatus === 'sent'    && <p style={{ fontSize: 11, color: 'var(--green)',  marginTop: 8 }}>✓ Invitation envoyée à {selected.email}</p>}
                      {inviteStatus === 'already' && <p style={{ fontSize: 11, color: 'var(--gold)',   marginTop: 8 }}>⚠ Compte existant — rôle mis à jour</p>}
                      {inviteStatus === 'error'   && <p style={{ fontSize: 11, color: 'var(--pink)',   marginTop: 8 }}>✗ Erreur — vérifiez l'adresse email</p>}
                    </>
                  )}
                </div>
              )}

              {/* ── Edit — editAccess / Delete — adminAccess ── */}
              {editAccess && (
                <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => { setEditTarget(selected); setSelected(null) }}
                  >
                    {t('drawer.edit')}
                  </button>
                  {adminAccess && (
                    <button
                      className="btn btn-ghost"
                      style={{ flex: 1, color: 'var(--pink)' }}
                      onClick={() => setConfirmDelete(true)}
                    >
                      ✕ Supprimer
                    </button>
                  )}
                </div>
              )}

              {/* Confirmation delete */}
              {confirmDelete && (
                <div style={{
                  marginTop: 20, padding: '14px 16px',
                  background: 'rgba(255,45,107,0.08)',
                  border: '1px solid rgba(255,45,107,0.25)',
                  borderRadius: 4,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text)', marginBottom: 12 }}>
                    Supprimer <strong>{selected.name}</strong> définitivement ?
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-sm"
                      style={{ flex: 1, background: 'var(--pink)', color: 'var(--bg)', border: 'none' }}
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? '...' : '✕ Confirmer'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => setConfirmDelete(false)}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

            </div>
          </>
        )}

        {/* Formulaires */}
        {showForm && (
          <ConsultantForm
            onClose={() => setShowForm(false)}
            onSaved={handleSaved}
          />
        )}
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