// components/consultants/ConsultantsClient.tsx
// ── Client Component ─────────────────────────────────────────
// Reçoit consultants + userRole en props.
// Tout l'interactif (drawer, form, invite, delete) reste ici.

'use client'

import { useState }          from 'react'
import { useRouter }         from 'next/navigation'
import { useTranslations }   from 'next-intl'
import { isAdmin, canEdit, canViewFinancials } from '@/lib/auth'
import { Panel, StatRow }    from '@/components/ui'
import { Avatar }            from '@/components/ui/Avatar'
import { Badge }             from '@/components/ui/Badge'
import { ProgressBar }       from '@/components/ui/ProgressBar'
import { EmptyState }        from '@/components/ui/EmptyState'
import { ConsultantTable }   from '@/components/consultants/ConsultantTable'
import { ConsultantForm }    from '@/components/consultants/ConsultantForm'
import { deleteConsultant }  from '@/lib/data'
import { toast }             from '@/lib/toast'
import type { ConsultantStatus, Consultant } from '@/types'

// ── Badge contrat ─────────────────────────────────────────────

function ContractBadge({ type }: { type: string }) {
  const t = useTranslations('consultants')
  const isFreelance = type === 'freelance'
  return (
    <span
      className="cons-contract-badge"
      style={{
        background: isFreelance ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.06)',
        border:     isFreelance ? '1px solid rgba(0,229,255,0.3)' : '1px solid var(--border)',
        color:      isFreelance ? 'var(--cyan)' : 'var(--text2)',
      }}
    >
      {t(isFreelance ? 'contractType.freelance' : 'contractType.employee')}
    </span>
  )
}

// ── Invite status ─────────────────────────────────────────────

type InviteStatus = 'idle' | 'sent' | 'already' | 'error'

function AccountSection({ selected, onInvite, inviteLoading, inviteStatus }: {
  selected:      Consultant
  onInvite:      () => void
  inviteLoading: boolean
  inviteStatus:  InviteStatus
}) {
  const t = useTranslations('consultants')
  return (
    <div className="cons-section">
      <div className="label-meta" style={{ marginBottom: 12 }}>{t('account.label')}</div>
      {selected.user_id ? (
        <div className="cons-account-linked">
          <span className="cons-account-dot cons-account-dot--linked">●</span>
          <div>
            <div className="cons-account-status">{t('account.linked')}</div>
            <div className="cons-account-email">{selected.email}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="cons-account-linked" style={{ marginBottom: 12 }}>
            <span className="cons-account-dot">○</span>
            <div>
              <div className="cons-account-status" style={{ color: 'var(--text2)' }}>{t('account.none')}</div>
              <div className="cons-account-email">
                {selected.email
                  ? selected.email
                  : <span style={{ color: 'var(--pink)' }}>{t('account.emailMissing')}</span>
                }
              </div>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', borderColor: 'var(--cyan)', color: 'var(--cyan)', opacity: (!selected.email || inviteLoading) ? 0.5 : 1 }}
            onClick={onInvite}
            disabled={!selected.email || inviteLoading}
          >
            {inviteLoading ? t('account.inviting') : t('account.invite')}
          </button>
          {inviteStatus === 'sent'    && <p className="cons-invite-msg cons-invite-msg--sent">{t('account.sent', { email: selected.email ?? '' })}</p>}
          {inviteStatus === 'already' && <p className="cons-invite-msg cons-invite-msg--already">{t('account.already')}</p>}
          {inviteStatus === 'error'   && <p className="cons-invite-msg cons-invite-msg--error">{t('account.error')}</p>}
        </>
      )}
    </div>
  )
}

// ── Delete confirm ────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onCancel, loading }: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const t = useTranslations('consultants')
  return (
    <div className="cons-delete-confirm">
      <div className="cons-delete-msg">{t('deleteConfirm.message', { name })}</div>
      <div className="cons-delete-actions">
        <button className="btn btn-sm cons-delete-btn" onClick={onConfirm} disabled={loading}>
          {loading ? '...' : t('deleteConfirm.confirm')}
        </button>
        <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onCancel}>
          {t('deleteConfirm.cancel')}
        </button>
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────

interface Props {
  companyId?:   string
  consultants?: any[]
  userRole?:    string
}

// ── Composant principal ───────────────────────────────────────

export function ConsultantsClient({ consultants = [], userRole, companyId }: Props) {
  const t       = useTranslations('consultants')
  const tCommon = useTranslations('common')
  const router  = useRouter()

  const adminAccess     = isAdmin(userRole)
  const editAccess      = canEdit(userRole)
  const financialAccess = canViewFinancials(userRole)

  const [filter,        setFilter]        = useState<ConsultantStatus | 'all'>('all')
  const [search,        setSearch]        = useState('')
  const [selected,      setSelected]      = useState<Consultant | null>(null)
  const [showForm,      setShowForm]      = useState(false)
  const [editTarget,    setEditTarget]    = useState<Consultant | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteStatus,  setInviteStatus]  = useState<InviteStatus>('idle')

  const FILTERS: { label: string; value: ConsultantStatus | 'all' }[] = [
    { label: t('filters.all'),       value: 'all'       },
    { label: t('filters.assigned'),  value: 'assigned'  },
    { label: t('filters.available'), value: 'available' },
    { label: t('filters.leave'),     value: 'leave'     },
    { label: t('filters.partial'),   value: 'partial'   },
  ]

  const visible = consultants.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter
    const matchSearch = (c.name  ?? '').toLowerCase().includes(search.toLowerCase())
                     || (c.role  ?? '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const stats = [
    { value: consultants.filter(c => c.status === 'assigned').length,  label: t('filters.assigned'),  color: 'var(--cyan)'   },
    { value: consultants.filter(c => c.status === 'available').length, label: t('filters.available'), color: 'var(--green)'  },
    { value: consultants.filter(c => c.status === 'leave').length,     label: t('filters.leave'),     color: 'var(--gold)'   },
    { value: consultants.filter(c => c.status === 'partial').length,   label: t('filters.partial'),   color: 'var(--purple)' },
  ]

  const countLabel = `${visible.length} ${visible.length > 1 ? tCommon('consultants') : tCommon('consultant')}`

  const closeDrawer = () => { setSelected(null); setConfirmDelete(false); setInviteStatus('idle') }

  const handleDelete = async () => {
    if (!selected) return
    setDeleting(true)
    try {
      await deleteConsultant(selected.id)
      closeDrawer()
      router.refresh()
    } catch (e) { toast.error(e) }
    finally { setDeleting(false) }
  }

  const handleInvite = async () => {
    if (!selected?.email) return
    setInviteLoading(true)
    setInviteStatus('idle')
    try {
      const res  = await fetch('/api/invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ consultantId: selected.id, email: selected.email, companyId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setInviteStatus(json.alreadyExisted ? 'already' : 'sent')
      router.refresh()
    } catch { setInviteStatus('error') }
    finally  { setInviteLoading(false) }
  }

  const drawerRows = selected ? [
    { label: t('drawer.status'),    value: <Badge variant={selected.status as any} /> },
    { label: t('drawer.project'),   value: selected.currentProject ?? '—' },
    { label: t('drawer.available'), value: selected.availableFrom
        ? new Date(selected.availableFrom).toLocaleDateString()
        : t('now') },
    ...(selected.contractType !== 'freelance'
      ? [{ label: t('drawer.leaveDays'), value: `${selected.leaveDaysLeft ?? 0} ${tCommon('days')}` }]
      : []),
    { label: t('drawer.occupancy'), value: `${selected.occupancyRate ?? 0}%` },
    ...(financialAccess ? [
      ...(selected.tjmCoutReel != null
        ? [{ label: t('drawer.tjmCout'), value: t('drawer.tjmCoutValue', {
              value: selected.tjmCoutReel,
              label: t(selected.contractType === 'freelance' ? 'costLabels.billed' : 'costLabels.charged'),
            }) }]
        : selected.tjm != null
        ? [{ label: t('drawer.tjmCout'), value: `${selected.tjm} €/j` }]
        : []),
      ...(selected.tjmCible != null
        ? [{ label: t('drawer.tjmCible'), value: t('drawer.tjmCibleValue', { value: selected.tjmCible }) }]
        : []),
    ] : []),
  ] as { label: string; value: React.ReactNode }[] : []

  return (
    <div className="app-content">

      <StatRow stats={stats} />

      <div className="sort-bar" style={{ flexWrap: 'wrap' }}>
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
        {editAccess && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            {t('cta')}
          </button>
        )}
      </div>

      <Panel title={countLabel} noPadding>
        {visible.length > 0 ? (
          <ConsultantTable
            consultants={visible}
            onSelect={c => { setSelected(c as Consultant); setInviteStatus('idle') }}
          />
        ) : (
          <EmptyState message={t('noResults')} />
        )}
      </Panel>

      {/* Drawer */}
      {selected && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <div className="cons-drawer">

            <div className="cons-drawer-header">
              <span className="label-meta">{t('drawer.label')}</span>
              <button className="btn btn-ghost btn-sm" onClick={closeDrawer}>{t('drawer.close')}</button>
            </div>

            <div className="cons-drawer-profile">
              <Avatar initials={selected.initials} color={selected.avatarColor} size="md" />
              <div>
                <div className="cons-drawer-name">{selected.name}</div>
                <div className="cons-drawer-role-row">
                  <span className="cons-drawer-role">{selected.role}</span>
                  {selected.contractType && <ContractBadge type={selected.contractType} />}
                </div>
                {selected.email && <div className="cons-drawer-email">{selected.email}</div>}
              </div>
            </div>

            {drawerRows.map(row => (
              <div key={row.label} className="project-drawer-row">
                <span className="project-drawer-row-label">{row.label}</span>
                <span className="project-drawer-row-value">{row.value}</span>
              </div>
            ))}

            {(selected.stack ?? []).length > 0 && (
              <div className="cons-section">
                <div className="label-meta" style={{ marginBottom: 8 }}>Stack</div>
                <div className="cons-stack">
                  {(selected.stack ?? []).map(s => (
                    <span key={s} className="cons-stack-tag">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="cons-section">
              <div className="label-meta" style={{ marginBottom: 8 }}>{t('drawer.rateLabel')}</div>
              <div className="cons-occ-value">{selected.occupancyRate ?? 0}%</div>
              <ProgressBar value={selected.occupancyRate ?? 0} style={{ height: 6 }} />
            </div>

            {adminAccess && (
              <AccountSection
                selected={selected}
                onInvite={handleInvite}
                inviteLoading={inviteLoading}
                inviteStatus={inviteStatus}
              />
            )}

            {editAccess && (
              <div className="cons-drawer-actions">
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
                    {t('deleteBtn')}
                  </button>
                )}
              </div>
            )}

            {confirmDelete && (
              <DeleteConfirm
                name={selected.name}
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(false)}
                loading={deleting}
              />
            )}

          </div>
        </>
      )}

      {showForm && (
        <ConsultantForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); router.refresh() }}
        />
      )}
      {editTarget && (
        <ConsultantForm
          consultant={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); router.refresh() }}
        />
      )}

    </div>
  )
}