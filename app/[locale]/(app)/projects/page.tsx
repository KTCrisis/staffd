'use client'

import { useState }        from 'react'
import { useTranslations } from 'next-intl'
import { Topbar }          from '@/components/layout/Topbar'
import { Panel, StatRow, Badge } from '@/components/ui'
import { EmptyState }      from '@/components/ui/EmptyState'
import { ProjectForm }     from '@/components/projects/ProjectForm'
import { AssignmentModal } from '@/components/projects/AssignmentModal'
import {
  useProjects, useProjectAssignments,
  archiveProject, deleteProject, deleteAssignment,
} from '@/lib/data'
import { daysUntil, countWorkingDays } from '@/lib/utils'
import type { Project } from '@/types'

// ── Types ─────────────────────────────────────────────────────

type FilterValue = 'all' | 'draft' | 'active' | 'on_hold' | 'completed'

// ── Helpers locaux ────────────────────────────────────────────

function Skeleton({ h = 44 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h }} />
}

// ── DeadlineChip ──────────────────────────────────────────────

function DeadlineChip({ date, t }: { date?: string; t: (k: string) => string }) {
  if (!date) return <span style={{ color: 'var(--text2)', fontSize: 11 }}>—</span>
  const days  = daysUntil(date)
  const color = days < 0 ? 'var(--pink)' : days <= 14 ? 'var(--gold)' : 'var(--text2)'
  const label = days < 0 ? t('deadline.overdue') : days === 0 ? t('deadline.today') : `${days} ${t('deadline.daysLeft')}`
  return (
    <span className="deadline-chip" style={{ color, fontWeight: days <= 14 ? 700 : 400 }}>
      {new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
      <span className="deadline-chip-label">({label})</span>
    </span>
  )
}

// ── TeamAvatars ───────────────────────────────────────────────

const AVATAR_CSS: Record<string, string> = {
  green: 'av-green', pink: 'av-pink', cyan: 'av-cyan',
  gold:  'av-gold',  purple: 'av-purple',
}

function TeamAvatars({ team }: {
  team?: { id: string; initials: string; name: string; avatarColor: string }[]
}) {
  if (!team?.length) return <span style={{ color: 'var(--text2)', fontSize: 11 }}>—</span>
  const MAX      = 4
  const shown    = team.slice(0, MAX)
  const overflow = team.length - MAX

  return (
    <div className="team-avatars">
      {shown.map((c, i) => (
        <div
          key={c.id}
          title={c.name}
          className={`team-avatar avatar ${AVATAR_CSS[c.avatarColor] ?? 'av-green'}`}
          style={{ zIndex: shown.length - i }}
        >
          {c.initials}
        </div>
      ))}
      {overflow > 0 && (
        <div className="team-avatar team-avatar--overflow">+{overflow}</div>
      )}
    </div>
  )
}

// ── ProjectTeam (section équipe dans le drawer) ───────────────

function ProjectTeam({ project, assignmentRefresh, onAssign, onRefresh }: {
  project:           Project
  assignmentRefresh: number
  onAssign:          () => void
  onRefresh:         () => void
}) {
  const t = useTranslations('assignments')
  const { data: assignments, loading } = useProjectAssignments(project.id, assignmentRefresh)
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleRemove(id: string) {
    if (!confirm(t('confirmRemove'))) return
    setRemoving(id)
    try   { await deleteAssignment(id); onRefresh() }
    catch (e: any) { alert(e.message) }
    finally { setRemoving(null) }
  }

  return (
    <div className="project-team-section">
      <div className="project-team-header">
        <span className="label-meta">{t('team')}</span>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--green)' }} onClick={onAssign}>
          + {t('assign')}
        </button>
      </div>

      {loading && <div className="project-team-loading">{t('loading')}</div>}

      {!loading && !(assignments ?? []).length && (
        <EmptyState message={t('noAssignments')} />
      )}

      {!loading && (assignments ?? []).map(a => (
        <div key={a.id} className="project-team-member">
          <div
            className={`avatar ${AVATAR_CSS[a.avatarColor ?? 'green'] ?? 'av-green'}`}
            style={{ width: 30, height: 30, fontSize: 10, flexShrink: 0 }}
          >
            {a.initials}
          </div>
          <div className="project-team-member-info">
            <div className="project-team-member-name">{a.name}</div>
            <div className="project-team-member-role">{a.role}</div>
          </div>
          <div className="project-team-member-alloc">
            <div
              className="project-team-member-pct"
              style={{ color: a.allocation === 100 ? 'var(--green)' : 'var(--gold)' }}
            >
              {a.allocation}%
            </div>
            {a.startDate && a.endDate && (
              <div className="project-team-member-days">
                {Math.round(a.allocation / 100 * countWorkingDays(a.startDate, a.endDate))} j
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--pink)', padding: '3px 8px' }}
            onClick={() => handleRemove(a.id)}
            disabled={removing === a.id}
            title={t('remove')}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function ProjectsPage() {
  const t = useTranslations('projects')

  const [refresh,           setRefresh]           = useState(0)
  const [assignmentRefresh, setAssignmentRefresh] = useState(0)
  const [filter,            setFilter]            = useState<FilterValue>('all')
  const [selected,          setSelected]          = useState<Project | null>(null)
  const [formOpen,          setFormOpen]          = useState(false)
  const [editProject,       setEditProject]       = useState<Project | null>(null)
  const [assignOpen,        setAssignOpen]        = useState(false)
  const [deleting,          setDeleting]          = useState(false)
  const [archiving,         setArchiving]         = useState(false)

  const { data: projects, loading, error } = useProjects(refresh)

  const FILTERS: { label: string; value: FilterValue }[] = [
    { label: t('filters.all'),       value: 'all'       },
    { label: t('filters.active'),    value: 'active'    },
    { label: t('filters.draft'),     value: 'draft'     },
    { label: t('filters.on_hold'),   value: 'on_hold'   },
    { label: t('filters.completed'), value: 'completed' },
  ]

  const visible = (projects ?? []).filter(p => filter === 'all' || p.status === filter)

  const stats = [
    { value: (projects ?? []).filter(p => p.status === 'active').length,    label: t('stats.active'),    color: 'var(--green)' },
    { value: (projects ?? []).filter(p => p.status === 'draft').length,     label: t('stats.draft'),     color: 'var(--cyan)'  },
    { value: (projects ?? []).filter(p => p.status === 'on_hold').length,   label: t('stats.onHold'),    color: 'var(--gold)'  },
    { value: (projects ?? []).filter(p => p.status === 'completed').length, label: t('stats.completed'), color: 'var(--text2)' },
  ]

  function openCreate() { setEditProject(null); setSelected(null); setFormOpen(true) }
  function openEdit(p: Project) { setEditProject(p); setSelected(null); setFormOpen(true) }
  function onSaved() { setRefresh(r => r + 1) }

  async function handleArchive(p: Project) {
    if (!confirm(t('confirmArchive', { name: p.name }))) return
    setArchiving(true)
    try   { await archiveProject(p.id); setSelected(null); setRefresh(r => r + 1) }
    catch (e: any) { alert(e.message) }
    finally { setArchiving(false) }
  }

  async function handleDelete(p: Project) {
    if (!confirm(t('confirmDelete', { name: p.name }))) return
    setDeleting(true)
    try   { await deleteProject(p.id); setSelected(null); setRefresh(r => r + 1) }
    catch (e: any) { alert(e.message) }
    finally { setDeleting(false) }
  }

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} ctaLabel={t('cta')} onCta={openCreate} />

      <div className="app-content">
        <StatRow stats={stats} />

        {/* Filtres */}
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
        </div>

        {/* Loading */}
        {loading && (
          <Panel noPadding>
            <div className="skeleton-list">
              {[1,2,3].map(i => <Skeleton key={i} />)}
            </div>
          </Panel>
        )}

        {/* Erreur */}
        {error && <p className="ts-status-msg ts-status-msg--error">{t('error')}: {error}</p>}

        {/* Table */}
        {!loading && !error && (
          <Panel noPadding>
            {visible.length === 0 ? (
              <EmptyState message={t('noResults')} />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('table.name')}</th>
                      <th>{t('table.client')}</th>
                      <th>{t('table.team')}</th>
                      <th>{t('table.deadline')}</th>
                      <th>{t('table.status')}</th>
                      <th>{t('table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(p => (
                      <tr key={p.id} onClick={() => { setSelected(p); setAssignOpen(false) }}>
                        <td>
                          <div className="project-name-cell">
                            <span className="td-primary">{p.name}</span>
                            {p.isInternal && <span className="tag-internal">{t('internal')}</span>}
                          </div>
                          {p.reference && <div className="project-ref">{p.reference}</div>}
                        </td>
                        <td style={{ color: 'var(--text2)', fontSize: 12 }}>
                          {p.clientName ?? p.client ?? '—'}
                        </td>
                        <td><TeamAvatars team={p.team} /></td>
                        <td><DeadlineChip date={p.endDate} t={t} /></td>
                        <td><Badge variant={p.status} /></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="row-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                              {t('actions.edit')}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--gold)' }}
                              onClick={() => handleArchive(p)}
                              disabled={archiving}
                            >
                              {t('actions.archive')}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--pink)' }}
                              onClick={() => handleDelete(p)}
                              disabled={deleting}
                            >
                              {t('actions.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {/* Drawer détail projet */}
        {selected && !formOpen && (
          <div className="project-drawer">
            <div className="project-drawer-header">
              <span className="label-meta">{t('drawer.label')}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="project-drawer-title-block">
              <div className="project-drawer-name-row">
                <div className="project-drawer-name">{selected.name}</div>
                {selected.isInternal && <span className="tag-internal">{t('internal')}</span>}
              </div>
              <div className="project-drawer-sub">
                {selected.clientName ?? selected.client}
                {selected.reference && ` · ${selected.reference}`}
              </div>
            </div>

            {selected.description && (
              <div className="project-drawer-description">{selected.description}</div>
            )}

            <div className="project-drawer-rows">
              {([
                { label: t('drawer.status'),    value: <Badge variant={selected.status} /> },
                { label: t('drawer.startDate'), value: selected.startDate ? new Date(selected.startDate).toLocaleDateString('fr-FR') : '—' },
                { label: t('drawer.deadline'),  value: <DeadlineChip date={selected.endDate} t={t} /> },
                ...(selected.tjmVendu    ? [{ label: t('drawer.tjm'),    value: `${selected.tjmVendu} €/j` }]                                 : []),
                ...(selected.joursVendus ? [{ label: t('drawer.jours'),  value: `${selected.joursVendus} j` }]                                : []),
                ...(selected.budgetTotal ? [{ label: t('drawer.budget'), value: `${selected.budgetTotal.toLocaleString('fr-FR')} €` }]        : []),
              ] as { label: string; value: React.ReactNode }[]).map((row, i) => (
                <div key={i} className="project-drawer-row">
                  <span className="project-drawer-row-label">{row.label}</span>
                  <span className="project-drawer-row-value">{row.value}</span>
                </div>
              ))}
            </div>

            <ProjectTeam
              project={selected}
              assignmentRefresh={assignmentRefresh}
              onAssign={() => setAssignOpen(true)}
              onRefresh={() => setAssignmentRefresh(r => r + 1)}
            />

            <div className="project-drawer-actions">
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => openEdit(selected)}>
                {t('drawer.edit')}
              </button>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, color: 'var(--gold)' }}
                onClick={() => handleArchive(selected)}
                disabled={archiving}
              >
                {t('drawer.archive')}
              </button>
            </div>
            <div className="project-drawer-delete">
              <button
                className="btn btn-ghost"
                style={{ width: '100%', color: 'var(--pink)' }}
                onClick={() => handleDelete(selected)}
                disabled={deleting}
              >
                {t('drawer.delete')}
              </button>
            </div>
          </div>
        )}

        {/* Modal assignment */}
        {assignOpen && selected && (
          <AssignmentModal
            project={selected}
            onClose={() => setAssignOpen(false)}
            onSaved={() => {
              setAssignOpen(false)
              setAssignmentRefresh(r => r + 1)
              setRefresh(r => r + 1)
            }}
          />
        )}

        {/* Formulaire */}
        {formOpen && (
          <ProjectForm
            project={editProject}
            onClose={() => { setFormOpen(false); setEditProject(null) }}
            onSaved={onSaved}
          />
        )}
      </div>
    </>
  )
}