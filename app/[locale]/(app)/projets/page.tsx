'use client'

import { useState }          from 'react'
import { useTranslations }   from 'next-intl'
import { Topbar }            from '@/components/layout/Topbar'
import { Panel, StatRow, Badge, Avatar, ProgressBar } from '@/components/ui'
import { PROJECTS, CONSULTANTS } from '@/lib/mock'
import type { Project, ProjectStatus } from '@/types'

// ── Helpers ──
function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0,0,0,0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function DeadlineChip({ date, t }: { date: string; t: (k: string) => string }) {
  const days = daysUntil(date)
  const color = days < 0 ? 'var(--pink)' : days <= 14 ? 'var(--gold)' : 'var(--text2)'
  const label = days < 0
    ? t('deadline.overdue')
    : days === 0
    ? t('deadline.today')
    : `${days} ${t('deadline.daysLeft')}`

  return (
    <span style={{ fontSize: 10, color, fontWeight: days <= 14 ? 700 : 400 }}>
      {new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
      <span style={{ marginLeft: 6, opacity: 0.8 }}>({label})</span>
    </span>
  )
}

// ── Page ──
export default function ProjetsPage() {
  const t = useTranslations('projets')
  const [filter, setFilter]   = useState<ProjectStatus | 'all'>('all')
  const [selected, setSelected] = useState<Project | null>(null)

  const FILTERS: { label: string; value: ProjectStatus | 'all' }[] = [
    { label: t('filters.all'),      value: 'all' },
    { label: t('filters.active'),   value: 'active' },
    { label: t('filters.starting'), value: 'starting' },
    { label: t('filters.done'),     value: 'done' },
  ]

  const visible = PROJECTS.filter((p: any) => filter === 'all' || p.status === filter)

  // Consultants assignés en tout (sans doublons)
  const assignedIds = new Set(PROJECTS.flatMap(p => p.consultantIds))

  const stats = [
    { value: PROJECTS.filter((p: any) => p.status === 'active').length,   label: t('stats.active'),      color: 'var(--green)' },
    { value: PROJECTS.filter((p: any) => p.status === 'starting').length, label: t('stats.starting'),    color: 'var(--cyan)' },
    { value: PROJECTS.filter((p: any) => p.status === 'done').length,     label: t('stats.done'),        color: 'var(--text2)' },
    { value: assignedIds.size,                                      label: t('stats.consultants'), color: 'var(--gold)' },
  ]

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} ctaLabel={t('cta')} onCta={() => {}} />

      <div className="app-content">

        <StatRow stats={stats} />

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {FILTERS.map((f: any) => (
            <button
              key={f.value}
              className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
          <button className="btn btn-ghost" style={{ marginLeft: 'auto' }}>
            {t('export')}
          </button>
        </div>

        {/* Tableau */}
        <Panel noPadding>
          {visible.length === 0
            ? <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                {t('noResults')}
              </div>
            : <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('table.name')}</th>
                      <th>{t('table.client')}</th>
                      <th>{t('table.team')}</th>
                      <th>{t('table.progress')}</th>
                      <th>{t('table.deadline')}</th>
                      <th>{t('table.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((p: any) => {
                      const team = CONSULTANTS.filter((c: any) => p.consultantIds.includes(c.id))
                      return (
                        <tr key={p.id} onClick={() => setSelected(p)}>
                          <td>
                            <span className="td-primary">{p.name}</span>
                          </td>
                          <td style={{ color: 'var(--text2)' }}>{p.client}</td>
                          <td>
                            <div style={{ display: 'flex', gap: -4 }}>
                              {team.slice(0, 4).map((c: any) => (
                                <div key={c.id} style={{ marginRight: -8 }}>
                                  <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
                                </div>
                              ))}
                              {team.length > 4 && (
                                <div style={{
                                  width: 26, height: 26, borderRadius: '50%',
                                  background: 'var(--bg3)', border: '1px solid var(--border)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 9, color: 'var(--text2)', marginLeft: 4
                                }}>
                                  +{team.length - 4}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ minWidth: 140 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, minWidth: 32 }}>{p.progress}%</span>
                              <ProgressBar value={p.progress} style={{ flex: 1 }} />
                            </div>
                          </td>
                          <td><DeadlineChip date={p.endDate} t={t} /></td>
                          <td><Badge variant={p.status} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
          }
        </Panel>

        {/* Drawer */}
        {selected && (() => {
          const team = CONSULTANTS.filter((c: any) => selected.consultantIds.includes(c.id))
          return (
            <div style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
              background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
              zIndex: 200, padding: 28, overflowY: 'auto',
              boxShadow: '-4px 0 20px var(--shadow)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
                  {t('drawer.label')}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
                  {t('drawer.close')}
                </button>
              </div>

              {/* Header projet */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cyan)', letterSpacing: -0.5, marginBottom: 4 }}>
                  {selected.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{selected.client}</div>
              </div>

              {/* Infos */}
              {[
                { label: t('drawer.client'),   value: selected.client },
                { label: t('drawer.status'),   value: <Badge variant={selected.status} /> },
                { label: t('drawer.deadline'), value: <DeadlineChip date={selected.endDate} t={t} /> },
              ].map((row: any) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}

              {/* Avancement */}
              <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
                    {t('drawer.progress')}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{selected.progress}%</span>
                </div>
                <ProgressBar value={selected.progress} style={{ height: 6 }} />
              </div>

              {/* Équipe */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
                  {t('drawer.team')} · {team.length} {t('drawer.teamCount')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {team.map((c: any) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)' }}>{c.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
                <button className="btn btn-primary" style={{ flex: 1 }}>{t('drawer.edit')}</button>
                <button className="btn btn-ghost" style={{ flex: 1 }}>{t('drawer.archive')}</button>
              </div>
            </div>
          )
        })()}

      </div>
    </>
  )
}
