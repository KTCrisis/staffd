// components/consultants/ConsultantDetailClient.tsx
'use client'

import { useState }          from 'react'
import { useRouter }         from 'next/navigation'
import { useTranslations }   from 'next-intl'
import { isAdmin, canEdit, canViewFinancials } from '@/lib/auth'
import { Avatar }            from '@/components/ui/Avatar'
import { Badge }             from '@/components/ui/Badge'
import { ProgressBar }       from '@/components/ui/ProgressBar'
import { Panel }             from '@/components/ui/Panel'
import { MargeBar }          from '@/components/ui/MargeBar'
import { ConsultantForm }    from '@/components/consultants/ConsultantForm'
import { deleteConsultant }  from '@/lib/data'
import { toast }             from '@/lib/toast'
import { fmt, fmtTjm, getMargeColor, formatDate } from '@/lib/utils'
import type { AvatarColor }  from '@/types'

// ── Types ─────────────────────────────────────────────────────

interface Assignment {
  id:         string
  allocation: number
  startDate:  string
  endDate:    string
  project:    { id: string; name: string; status: string; clientName: string | null } | null
}

interface Consultant {
  id:            string
  name:          string
  initials:      string
  role:          string
  email:         string | null
  avatarColor:   string
  status:        string
  contractType:  string
  occupancyRate: number
  leaveDaysLeft: number
  leaveDaysTotal: number
  rttLeft:       number
  rttTotal:      number
  stack:         string[]
  currentProject: string | null
  availableFrom: string | null
  tjmCoutReel:   number | null
  tjmCible:      number | null
  user_id:       string | null
  countryCode:   string | null
}

interface Props {
  consultant:    Consultant
  assignments?:  Assignment[]
  profitability?: any
  userRole?:     string
}

// ── Helpers ───────────────────────────────────────────────────

function ContractBadge({ type }: { type: string }) {
  const t = useTranslations('consultants')
  const isFree = type === 'freelance'
  return (
    <span className="cons-contract-badge" style={{
      background: isFree ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.06)',
      border:     isFree ? '1px solid rgba(0,229,255,0.3)' : '1px solid var(--border)',
      color:      isFree ? 'var(--cyan)' : 'var(--text2)',
    }}>
      {type === 'freelance' ? t('contractType.freelance') : t('contractType.employee')}
    </span>
  )
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 3,
      textTransform: 'uppercase', marginBottom: 14, paddingBottom: 8,
      borderBottom: '1px solid var(--border)' }}>
      {label}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="project-drawer-row">
      <span className="project-drawer-row-label">{label}</span>
      <span className="project-drawer-row-value">{value}</span>
    </div>
  )
}

// ── Composant ─────────────────────────────────────────────────

export function ConsultantDetailClient({ consultant: c, assignments = [], profitability, userRole }: Props) {
  const t       = useTranslations('consultants')
  const router  = useRouter()

  const adminAccess     = isAdmin(userRole)
  const editAccess      = canEdit(userRole)
  const financialAccess = canViewFinancials(userRole)

  const [showForm,    setShowForm]    = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteConsultant(c.id)
      router.push('/consultants')
    } catch (e) { toast.error(e) }
    finally { setDeleting(false) }
  }

  const mColor = profitability ? getMargeColor(profitability.marge_pct ?? 0) : undefined

  return (
    <div className="app-content">
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Colonne gauche : profil ───────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Panel>
            {/* Avatar + identité */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
              <Avatar initials={c.initials} color={c.avatarColor as AvatarColor} size="lg" />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
                <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 8 }}>{c.role}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Badge variant={c.status as any} />
                  <ContractBadge type={c.contractType} />
                </div>
              </div>
            </div>

            {/* Infos */}
            <SectionTitle label={t('drawer.label')} />
            {c.email && <InfoRow label="Email" value={
              <a href={`mailto:${c.email}`} style={{ color: 'var(--cyan)' }}>{c.email}</a>
            } />}
            {c.countryCode && <InfoRow label={t('table.country') ?? 'Country'} value={c.countryCode} />}
            <InfoRow label={t('drawer.available')} value={
              c.availableFrom ? formatDate(c.availableFrom) : t('now')
            } />
            <InfoRow label={t('drawer.project')} value={c.currentProject ?? '—'} />
            <InfoRow label={t('account.label')} value={
              c.user_id
                ? <span style={{ color: 'var(--green)', fontSize: 11 }}>● {t('account.linked')}</span>
                : <span style={{ color: 'var(--text2)', fontSize: 11 }}>○ {t('account.none')}</span>
            } />

            {/* Occupation */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="label-meta">{t('drawer.rateLabel')}</span>
                <span style={{ fontWeight: 700, color: c.occupancyRate >= 80 ? 'var(--green)' : 'var(--gold)' }}>
                  {c.occupancyRate}%
                </span>
              </div>
              <ProgressBar value={c.occupancyRate} style={{ height: 6 }} />
            </div>

            {/* Stack */}
            {c.stack.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="label-meta" style={{ marginBottom: 8 }}>Stack</div>
                <div className="cons-stack">
                  {c.stack.map(s => <span key={s} className="cons-stack-tag">{s}</span>)}
                </div>
              </div>
            )}

            {/* Actions */}
            {editAccess && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-primary" style={{ width: '100%' }}
                  onClick={() => setShowForm(true)}>
                  {t('drawer.edit')}
                </button>
                {adminAccess && !confirmDel && (
                  <button className="btn btn-ghost" style={{ width: '100%', color: 'var(--pink)' }}
                    onClick={() => setConfirmDel(true)}>
                    {t('deleteBtn')}
                  </button>
                )}
                {confirmDel && (
                  <div className="cons-delete-confirm">
                    <div className="cons-delete-msg">{t('deleteConfirm.message', { name: c.name })}</div>
                    <div className="cons-delete-actions">
                      <button className="btn btn-sm cons-delete-btn" onClick={handleDelete} disabled={deleting}>
                        {deleting ? '...' : t('deleteConfirm.confirm')}
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setConfirmDel(false)}>
                        {t('deleteConfirm.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>

          {/* Congés */}
          {c.contractType !== 'freelance' && (
            <Panel title={t('soldes.title') ?? 'Leave balance'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="label-meta">CP</span>
                    <span style={{ fontWeight: 700 }}>{c.leaveDaysLeft} / {c.leaveDaysTotal}j</span>
                  </div>
                  <ProgressBar value={(c.leaveDaysLeft / Math.max(c.leaveDaysTotal, 1)) * 100} style={{ height: 4 }} />
                </div>
                {c.rttTotal > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span className="label-meta">RTT</span>
                      <span style={{ fontWeight: 700 }}>{c.rttLeft} / {c.rttTotal}j</span>
                    </div>
                    <ProgressBar value={(c.rttLeft / Math.max(c.rttTotal, 1)) * 100} style={{ height: 4 }} />
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>

        {/* ── Colonne droite ────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Financials */}
          {financialAccess && (c.tjmCoutReel != null || profitability) && (
            <Panel title="// financials">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {c.tjmCoutReel != null && (
                  <div style={{ padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                      {t(c.contractType === 'freelance' ? 'costLabels.billed' : 'costLabels.charged')}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{fmtTjm(c.tjmCoutReel)}</div>
                  </div>
                )}
                {c.tjmCible != null && (
                  <div style={{ padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                      {t('drawer.tjmCible')}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>{fmtTjm(c.tjmCible)}</div>
                  </div>
                )}
                {profitability?.ca_genere != null && (
                  <div style={{ padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                      CA généré
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--cyan)' }}>{fmt(profitability.ca_genere)}</div>
                  </div>
                )}
              </div>
              {profitability?.marge_pct != null && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className="label-meta">Marge brute</span>
                    <span style={{ fontWeight: 700, color: mColor }}>{profitability.marge_pct}%</span>
                  </div>
                  <MargeBar pct={profitability.marge_pct} />
                </div>
              )}
            </Panel>
          )}

          {/* Assignments */}
          <Panel title={`// missions (${assignments.length})`} noPadding>
            {assignments.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                {t('noAssignments') ?? '// aucune mission'}
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('table.project') ?? 'Projet'}</th>
                      <th>{t('table.client') ?? 'Client'}</th>
                      <th>{t('table.status') ?? 'Statut'}</th>
                      <th style={{ textAlign: 'right' }}>Alloc.</th>
                      <th>Début</th>
                      <th>Fin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => (
                      <tr key={a.id}>
                        <td>
                          <span className="td-primary">{a.project?.name ?? '—'}</span>
                        </td>
                        <td style={{ color: 'var(--text2)' }}>
                          {a.project?.clientName ?? '—'}
                        </td>
                        <td>
                          {a.project && <Badge variant={a.project.status as any} />}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700,
                          color: a.allocation === 100 ? 'var(--green)' : 'var(--gold)' }}>
                          {a.allocation}%
                        </td>
                        <td style={{ color: 'var(--text2)', fontSize: 11 }}>
                          {formatDate(a.startDate)}
                        </td>
                        <td style={{ color: 'var(--text2)', fontSize: 11 }}>
                          {formatDate(a.endDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

        </div>
      </div>

      {showForm && (
        <ConsultantForm
          consultant={c as any}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); router.refresh() }}
        />
      )}
    </div>
  )
}