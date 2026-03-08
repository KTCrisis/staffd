// components/projects/ProjectsClient.tsx
'use client'

import { useState }        from 'react'
import { useRouter }       from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Panel, StatRow, Badge } from '@/components/ui'
import { EmptyState }      from '@/components/ui/EmptyState'
import { ProjectForm }     from '@/components/projects/ProjectForm'
import { AssignmentModal } from '@/components/projects/AssignmentModal'
import { toast }           from '@/lib/toast'
import {
  useProjectAssignments,
  archiveProject, deleteProject, deleteAssignment,
} from '@/lib/data'
import { daysUntil, countWorkingDays } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────

type FilterValue = 'all' | 'draft' | 'active' | 'on_hold' | 'completed'

interface ProjectTeamMember {
  id:          string
  name:        string
  initials:    string
  avatarColor: string
}

interface Project {
  id:          string
  name:        string
  status:      string
  reference?:  string | null
  description?: string | null
  clientName?: string | null
  client?:     string | null
  startDate?:  string | null
  endDate?:    string | null
  tjmVendu?:   number | null
  joursVendus?: number | null
  budgetTotal?: number | null
  isInternal?: boolean
  progress?:   number
  team?:       ProjectTeamMember[]
}

// ── Helpers ───────────────────────────────────────────────────

const AVATAR_CSS: Record<string, string> = {
  green: 'av-green', pink: 'av-pink', cyan: 'av-cyan',
  gold:  'av-gold',  purple: 'av-purple',
}

function DeadlineChip({ date, t }: { date?: string | null; t: (k: string) => string }) {
  if (!date) return <span style={{ color: 'var(--text2)', fontSize: 11 }}>—</span>
  const days  = daysUntil(date)
  const color = days < 0 ? 'var(--pink)' : days <= 14 ? 'var(--gold)' : 'var(--text2)'
  const label = days < 0 ? t('deadline.overdue') : days === 0 ? t('deadline.today') : `${days} ${t('deadline.daysLeft')}`
  return (
    <span className="deadline-chip" style={{ color, fontWeight: days <= 14 ? 700 : 400 }}>
      {new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' })}
      <span className="deadline-chip-label">({label})</span>
    </span>
  )
}

function TeamAvatars({ team }: { team?: ProjectTeamMember[] }) {
  if (!team?.length) return <span style={{ color: 'var(--text2)', fontSize: 11 }}>—</span>
  const MAX      = 4
  const shown    = team.slice(0, MAX)
  const overflow = team.length - MAX
  return (
    <div className="team-avatars">
      {shown.map((c, i) => (
        <div key={c.id} title={c.name}
          className={`team-avatar avatar ${AVATAR_CSS[c.avatarColor] ?? 'av-green'}`}
          style={{ zIndex: shown.length - i }}>
          {c.initials}
        </div>
      ))}
      {overflow > 0 && <div className="team-avatar team-avatar--overflow">+{overflow}</div>}
    </div>
  )
}

// ── ProjectTeam ──────────────────────────────────────────────

function ProjectTeam({ project, assignmentRefresh, onAssign, onRefresh, readOnly }: {  // ← readOnly
  project:           Project
  assignmentRefresh: number
  onAssign:          () => void
  onRefresh:         () => void
  readOnly?:         boolean                                                            // ← AJOUT
}) {
  const t = useTranslations('assignments')
  const { data: assignments, loading } = useProjectAssignments(project.id, assignmentRefresh)
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleRemove(id: string) {
    if (!confirm(t('confirmRemove'))) return
    setRemoving(id)
    try   { await deleteAssignment(id); onRefresh() }
    catch (e) { toast.error(e) }
    finally { setRemoving(null) }
  }

  return (
    <div className="project-team-section">
      <div className="project-team-header">
        <span className="label-meta">{t('team')}</span>
        {!readOnly && (                                                                  // ← AJOUT
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--green)' }} onClick={onAssign}>
            + {t('assign')}
          </button>
        )}
      </div>
      {loading && <div className="project-team-loading">{t('loading')}</div>}
      {!loading && !(assignments ?? []).length && <EmptyState message={t('noAssignments')} />}
      {!loading && (assignments ?? []).map(a => (
        <div key={a.id} className="project-team-member">
          <div className={`avatar ${AVATAR_CSS[(a as any).avatarColor ?? 'green'] ?? 'av-green'}`}
            style={{ width: 30, height: 30, fontSize: 10, flexShrink: 0 }}>
            {(a as any).initials}
          </div>
          <div className="project-team-member-info">
            <div className="project-team-member-name">{(a as any).name}</div>
            <div className="project-team-member-role">{(a as any).role}</div>
          </div>
          <div className="project-team-member-alloc">
            <div className="project-team-member-pct"
              style={{ color: (a as any).allocation === 100 ? 'var(--green)' : 'var(--gold)' }}>
              {(a as any).allocation}%
            </div>
            {(a as any).startDate && (a as any).endDate && (
              <div className="project-team-member-days">
                {Math.round((a as any).allocation / 100 * countWorkingDays((a as any).startDate, (a as any).endDate))} j
              </div>
            )}
          </div>
          {!readOnly && (                                                                // ← AJOUT
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--pink)', padding: '3px 8px' }}
              onClick={() => handleRemove(a.id)} disabled={removing === a.id} title={t('remove')}>
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────

interface Props {
  projects?: Project[]
  error?:    string | null
  userRole?: string                                                                      // ← AJOUT
}

// ── Composant principal ───────────────────────────────────────

export function ProjectsClient({ projects = [], error, userRole }: Props) {               // ← userRole
  const t      = useTranslations('projects')
  const router = useRouter()

  const readOnly = userRole === 'consultant' || userRole === 'freelance'                  // ← AJOUT

  const [assignmentRefresh, setAssignmentRefresh] = useState(0)
  const [filter,            setFilter]            = useState<FilterValue>('all')
  const [showInternal,      setShowInternal]      = useState(false)
  const [selected,          setSelected]          = useState<Project | null>(null)
  const [formOpen,          setFormOpen]          = useState(false)
  const [editProject,       setEditProject]       = useState<Project | null>(null)
  const [assignOpen,        setAssignOpen]        = useState(false)
  const [deleting,          setDeleting]          = useState(false)
  const [archiving,         setArchiving]         = useState(false)

  const FILTERS: { label: string; value: FilterValue }[] = [
    { label: t('filters.all'),       value: 'all'       },
    { label: t('filters.active'),    value: 'active'    },
    { label: t('filters.draft'),     value: 'draft'     },
    { label: t('filters.on_hold'),   value: 'on_hold'   },
    { label: t('filters.completed'), value: 'completed' },
  ]

  const visible = projects.filter(p =>
    (filter === 'all' || p.status === filter) &&
    (showInternal || !p.isInternal)
  )
  const stats = [
    { value: visible.filter(p => p.status === 'active').length,    label: t('stats.active'),    color: 'var(--green)' },
    { value: visible.filter(p => p.status === 'draft').length,     label: t('stats.draft'),     color: 'var(--cyan)'  },
    { value: visible.filter(p => p.status === 'on_hold').length,   label: t('stats.onHold'),    color: 'var(--gold)'  },
    { value: visible.filter(p => p.status === 'completed').length, label: t('stats.completed'), color: 'var(--text2)' },
  ]

  function openCreate() { setEditProject(null); setSelected(null); setFormOpen(true) }
  function openEdit(p: Project) { setEditProject(p as any); setSelected(null); setFormOpen(true) }

  async function handleArchive(p: Project) {
    if (!confirm(t('confirmArchive', { name: p.name }))) return
    setArchiving(true)
    try   { await archiveProject(p.id); setSelected(null); router.refresh() }
    catch (e) { toast.error(e) }
    finally { setArchiving(false) }
  }

  async function handleDelete(p: Project) {
    if (!confirm(t('confirmDelete', { name: p.name }))) return
    setDeleting(true)
    try   { await deleteProject(p.id); setSelected(null); router.refresh() }
    catch (e) { toast.error(e) }
    finally { setDeleting(false) }
  }

  return (
    <div className="app-content">
      <StatRow stats={stats} />

      <div className="sort-bar" style={{ flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.value} className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
        {!readOnly && (                                                                   
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openCreate}>
            {t('cta')}
          </button>
        )}
        <button
          className={`btn ${showInternal ? 'btn-primary' : 'btn-ghost'}`}
          style={{ color: showInternal ? undefined : 'var(--text2)', fontSize: 10, marginLeft: readOnly ? 'auto' : undefined }}
          onClick={() => setShowInternal(v => !v)}
        >
          ◧ {t('filters.toggleInternal')}
        </button>
      </div>

      {error && <p className="ts-status-msg ts-status-msg--error">{t('error')}: {error}</p>}

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
                  {!readOnly && <th>{t('table.actions')}</th>}
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
                    <td><Badge variant={p.status as any} /></td>
                    {!readOnly && (                                                      
                      <td onClick={e => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                            {t('actions.edit')}
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--gold)' }}
                            onClick={() => handleArchive(p)} disabled={archiving}>
                            {t('actions.archive')}
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--pink)' }}
                            onClick={() => handleDelete(p)} disabled={deleting}>
                            {t('actions.delete')}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Drawer — lecture seule pour consultant */}
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
          {([
            { label: t('drawer.status'),    value: <Badge variant={selected.status as any} /> },
            { label: t('drawer.startDate'), value: selected.startDate ? new Date(selected.startDate).toLocaleDateString() : '—' },
            { label: t('drawer.deadline'),  value: <DeadlineChip date={selected.endDate} t={t} /> },
            ...(selected.tjmVendu    ? [{ label: t('drawer.tjm'),    value: `${selected.tjmVendu} €/j` }]                   : []),
            ...(selected.joursVendus ? [{ label: t('drawer.jours'),  value: `${selected.joursVendus} j` }]                  : []),
            ...(selected.budgetTotal ? [{ label: t('drawer.budget'), value: `${selected.budgetTotal.toLocaleString()} €` }] : []),
          ] as { label: string; value: React.ReactNode }[]).map((row, i) => (
            <div key={i} className="project-drawer-row">
              <span className="project-drawer-row-label">{row.label}</span>
              <span className="project-drawer-row-value">{row.value}</span>
            </div>
          ))}
          
          {(selected.progress ?? 0) > 0 && (
            <div className="project-drawer-row" style={{ flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="project-drawer-row-label">{t('drawer.progress')}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>
                  {selected.progress}%
                </span>
              </div>
              <div style={{
                width: '100%', height: 4, background: 'var(--border)',
                borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${selected.progress}%`, height: '100%',
                  background: selected.progress! >= 75 ? 'var(--green)' : selected.progress! >= 40 ? 'var(--gold)' : 'var(--cyan)',
                  borderRadius: 2, transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}

          <ProjectTeam
            project={selected}
            assignmentRefresh={assignmentRefresh}
            onAssign={() => setAssignOpen(true)}
            onRefresh={() => setAssignmentRefresh(r => r + 1)}
            readOnly={readOnly}                                                          
          />
          {!readOnly && (                                                                 
            <>
              <div className="project-drawer-actions">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => openEdit(selected)}>
                  {t('drawer.edit')}
                </button>
                <button className="btn btn-ghost" style={{ flex: 1, color: 'var(--gold)' }}
                  onClick={() => handleArchive(selected)} disabled={archiving}>
                  {t('drawer.archive')}
                </button>
              </div>
              <div className="project-drawer-delete">
                <button className="btn btn-ghost" style={{ width: '100%', color: 'var(--pink)' }}
                  onClick={() => handleDelete(selected)} disabled={deleting}>
                  {t('drawer.delete')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!readOnly && assignOpen && selected && (                                           
        <AssignmentModal
          project={selected as any}
          onClose={() => setAssignOpen(false)}
          onSaved={() => {
            setAssignOpen(false)
            setAssignmentRefresh(r => r + 1)
            router.refresh()
          }}
        />
      )}

      {!readOnly && formOpen && (                                                         
        <ProjectForm
          project={editProject as any}
          onClose={() => { setFormOpen(false); setEditProject(null) }}
          onSaved={() => { router.refresh() }}
        />
      )}
    </div>
  )
}