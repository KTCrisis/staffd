'use client'

/**
 * app/[locale]/(app)/projects/page.tsx
 * Branché sur Supabase — CRUD complet + Assignments dans le drawer
 */

import { useState }        from 'react'
import { useTranslations } from 'next-intl'
import { Topbar }          from '@/components/layout/Topbar'
import { Panel, StatRow, Badge } from '@/components/ui'
import { ProjectForm }     from '@/components/projects/ProjectForm'
import { AssignmentModal } from '@/components/projects/AssignmentModal'
import {
  useProjects, useProjectAssignments,
  archiveProject, deleteProject, deleteAssignment,
} from '@/lib/data'
import type { Project } from '@/types'

// ── Helpers ──────────────────────────────────────────────────

function daysUntil(dateStr?: string): number {
  if (!dateStr) return 999
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function DeadlineChip({ date, t }: { date?: string; t: (k: string) => string }) {
  if (!date) return <span style={{ color: 'var(--text2)', fontSize: 11 }}>—</span>
  const days  = daysUntil(date)
  const color = days < 0 ? 'var(--pink)' : days <= 14 ? 'var(--gold)' : 'var(--text2)'
  const label = days < 0 ? t('deadline.overdue') : days === 0 ? t('deadline.today') : `${days} ${t('deadline.daysLeft')}`
  return (
    <span style={{ fontSize: 10, color, fontWeight: days <= 14 ? 700 : 400 }}>
      {new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
      <span style={{ marginLeft: 6, opacity: 0.8 }}>({label})</span>
    </span>
  )
}

type FilterValue = 'all' | 'draft' | 'active' | 'on_hold' | 'completed'


const AVATAR_COLORS: Record<string, string> = {
  green: 'av-green', pink: 'av-pink', cyan: 'av-cyan',
  gold: 'av-gold', purple: 'av-purple',
}


const AVATAR_BG: Record<string, string> = {
  green:  'linear-gradient(135deg, #00ff88, #00cc6e)',
  pink:   'linear-gradient(135deg, #ff2d6b, #cc2255)',
  cyan:   'linear-gradient(135deg, #00e5ff, #00b8cc)',
  gold:   'linear-gradient(135deg, #ffd166, #cc9900)',
  purple: 'linear-gradient(135deg, #b388ff, #7c4dff)',
}
const AVATAR_COLOR: Record<string, string> = {
  green: 'av-green', pink: 'av-pink', cyan: 'av-cyan',
  gold: 'av-gold', purple: 'av-purple',
}

// ── Sub-component : Team section ─────────────────────────────

function TeamAvatars({ team }: { team?: { id: string; initials: string; name: string; avatarColor: string }[] }) {
  if (!team || team.length === 0) {
    return <span style={{ color: 'var(--text2)', fontSize: 11 }}>—</span>
  }
  const MAX = 4
  const shown   = team.slice(0, MAX)
  const overflow = team.length - MAX

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((c, i) => (
        <div
          key={c.id}
          title={c.name}
          style={{
            width: 26, height: 26,
            borderRadius: '50%',
            background: AVATAR_BG[c.avatarColor] ?? AVATAR_BG.green,
            color: AVATAR_COLOR[c.avatarColor] ?? '#060a06',
            fontSize: 9,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: i === 0 ? 0 : -8,
            border: '2px solid var(--bg2)',
            flexShrink: 0,
            cursor: 'default',
            zIndex: shown.length - i,
            position: 'relative',
          }}
        >
          {c.initials}
        </div>
      ))}
      {overflow > 0 && (
        <div style={{
          width: 26, height: 26,
          borderRadius: '50%',
          background: 'var(--bg4)',
          color: 'var(--text2)',
          fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginLeft: -8,
          border: '2px solid var(--bg2)',
          position: 'relative',
        }}>
          +{overflow}
        </div>
      )}
    </div>
  )
}


function ProjectTeam({
  project, assignmentRefresh, onAssign, onRefresh,
}: {
  project: Project; assignmentRefresh: number
  onAssign: () => void; onRefresh: () => void
}) {
  const t = useTranslations('assignments')
  const { data: assignments, loading } = useProjectAssignments(project.id, assignmentRefresh)
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleRemove(id: string) {
    if (!confirm(t('confirmRemove'))) return
    setRemoving(id)
    try {
      await deleteAssignment(id)
      onRefresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
          {t('team')}
        </span>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--green)' }} onClick={onAssign}>
          + {t('assign')}
        </button>
      </div>

      {loading && <div style={{ fontSize: 11, color: 'var(--text2)', padding: '8px 0' }}>{t('loading')}</div>}

      {!loading && (assignments ?? []).length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic', padding: '8px 0' }}>
          {t('noAssignments')}
        </div>
      )}

      {!loading && (assignments ?? []).map(a => (
        <div key={a.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 0', borderBottom: '1px solid var(--border)',
        }}>
          <div
            className={`avatar ${AVATAR_COLORS[a.avatarColor ?? 'green'] ?? 'av-green'}`}
            style={{ width: 30, height: 30, fontSize: 10, flexShrink: 0 }}
          >
            {a.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{a.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>{a.role}</div>
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: a.allocation === 100 ? 'var(--green)' : 'var(--gold)',
          }}>
            {a.allocation}%
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

// ── Page ─────────────────────────────────────────────────────

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
    { label: t('filters.all'),       value: 'all' },
    { label: t('filters.active'),    value: 'active' },
    { label: t('filters.draft'),     value: 'draft' },
    { label: t('filters.on_hold'),   value: 'on_hold' },
    { label: t('filters.completed'), value: 'completed' },
  ]

  const visible = (projects ?? []).filter(p => filter === 'all' || p.status === filter)

  const stats = [
    { value: (projects ?? []).filter(p => p.status === 'active').length,    label: t('stats.active'),    color: 'var(--green)' },
    { value: (projects ?? []).filter(p => p.status === 'draft').length,     label: t('stats.draft'),     color: 'var(--cyan)' },
    { value: (projects ?? []).filter(p => p.status === 'on_hold').length,   label: t('stats.onHold'),    color: 'var(--gold)' },
    { value: (projects ?? []).filter(p => p.status === 'completed').length, label: t('stats.completed'), color: 'var(--text2)' },
  ]

  function openCreate() { setEditProject(null); setSelected(null); setFormOpen(true) }
  function openEdit(p: Project) { setEditProject(p); setSelected(null); setFormOpen(true) }
  function onSaved() { setRefresh(r => r + 1) }

  async function handleArchive(p: Project) {
    if (!confirm(t('confirmArchive', { name: p.name }))) return
    setArchiving(true)
    try { await archiveProject(p.id); setSelected(null); setRefresh(r => r + 1) }
    catch (e: any) { alert(e.message) }
    finally { setArchiving(false) }
  }

  async function handleDelete(p: Project) {
    if (!confirm(t('confirmDelete', { name: p.name }))) return
    setDeleting(true)
    try { await deleteProject(p.id); setSelected(null); setRefresh(r => r + 1) }
    catch (e: any) { alert(e.message) }
    finally { setDeleting(false) }
  }

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} ctaLabel={t('cta')} onCta={openCreate} />

      <div className="app-content">
        <StatRow stats={stats} />

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.value} className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>

        {loading && <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>{t('loading')}</div>}
        {error   && <div style={{ padding: 16, color: 'var(--pink)', fontSize: 12 }}>{t('error')}: {error}</div>}

        {!loading && !error && (
          <Panel noPadding>
            {visible.length === 0
              ? <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>{t('noResults')}</div>
              : (
                <div style={{ overflowX: 'auto' }}>
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
                        <tr key={p.id} onClick={() => { setSelected(p); setAssignOpen(false) }} style={{ cursor: 'pointer' }}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="td-primary">{p.name}</span>
                              {p.isInternal && (
                                <span style={{ fontSize: 9, color: 'var(--cyan)', background: 'rgba(0,200,255,0.1)', padding: '1px 6px', borderRadius: 10 }}>
                                  {t('internal')}
                                </span>
                              )}
                            </div>
                            {p.reference && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{p.reference}</div>}
                          </td>
                          <td style={{ color: 'var(--text2)', fontSize: 12 }}>{p.clientName ?? p.client ?? '—'}</td>
                          <td><TeamAvatars team={p.team} /></td>
                          <td><DeadlineChip date={p.endDate} t={t} /></td>
                          <td><Badge variant={p.status} /></td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>{t('actions.edit')}</button>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--gold)' }} onClick={() => handleArchive(p)} disabled={archiving}>{t('actions.archive')}</button>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--pink)' }} onClick={() => handleDelete(p)} disabled={deleting}>{t('actions.delete')}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </Panel>
        )}

        {/* ── Drawer détail projet ── */}
        {selected && !formOpen && (
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
            background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
            zIndex: 200, padding: 28, overflowY: 'auto',
            boxShadow: '-4px 0 20px var(--shadow)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
                {t('drawer.label')}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cyan)', letterSpacing: -0.5 }}>{selected.name}</div>
                {selected.isInternal && <span className="tag-internal">{t('internal')}</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                {selected.clientName ?? selected.client}
                {selected.reference && ` · ${selected.reference}`}
              </div>
            </div>

            {/* Description */}
            {selected.description && (
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, padding: '12px 0', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                {selected.description}
              </div>
            )}

            {/* Infos */}
            {([
              { label: t('drawer.status'),    value: <Badge variant={selected.status} /> },
              { label: t('drawer.startDate'), value: selected.startDate ? new Date(selected.startDate).toLocaleDateString('fr-FR') : '—' },
              { label: t('drawer.deadline'),  value: <DeadlineChip date={selected.endDate} t={t} /> },
              ...(selected.tjmVendu    ? [{ label: t('drawer.tjm'),    value: `${selected.tjmVendu} €/j` }] : []),
              ...(selected.joursVendus ? [{ label: t('drawer.jours'),  value: `${selected.joursVendus} j` }] : []),
              ...(selected.budgetTotal ? [{ label: t('drawer.budget'), value: `${selected.budgetTotal.toLocaleString('fr-FR')} €` }] : []),
            ] as { label: string; value: React.ReactNode }[]).map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}

            {/* ── Équipe ── */}
            <ProjectTeam
              project={selected}
              assignmentRefresh={assignmentRefresh}
              onAssign={() => setAssignOpen(true)}
              onRefresh={() => setAssignmentRefresh(r => r + 1)}
            />

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => openEdit(selected)}>{t('drawer.edit')}</button>
              <button className="btn btn-ghost" style={{ flex: 1, color: 'var(--gold)' }} onClick={() => handleArchive(selected)} disabled={archiving}>{t('drawer.archive')}</button>
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ width: '100%', color: 'var(--pink)' }} onClick={() => handleDelete(selected)} disabled={deleting}>{t('drawer.delete')}</button>
            </div>
          </div>
        )}

        {/* ── Modal assignment ── */}
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

        {/* ── Formulaire ── */}
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