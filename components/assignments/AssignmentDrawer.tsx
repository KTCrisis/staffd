'use client'

/**
 * components/assignments/AssignmentDrawer.tsx
 *
 * Drawer d'affectation rapide — mode consultant-centrique.
 * Utilisé depuis la page Staffing : on a un consultant + une date,
 * on choisit un projet et on ajuste les dates/allocation.
 *
 * Ne pas confondre avec AssignmentModal (project-centrique, dans projects/page.tsx).
 */

import { useState }          from 'react'
import { useTranslations }   from 'next-intl'
import { useAuthContext }    from '@/components/layout/AuthProvider'
import { useProjects, createAssignment } from '@/lib/data'
import { Avatar }            from '@/components/ui/Avatar'
import type { Consultant }   from '@/types'

interface Props {
  consultant:  Consultant
  defaultDate: string        // date cliquée dans la grille (YYYY-MM-DD)
  onClose:     () => void
  onSaved:     () => void
}

export function AssignmentDrawer({ consultant, defaultDate, onClose, onSaved }: Props) {
  const t    = useTranslations('assignments')
  const tS   = useTranslations('staffing')
  const { user } = useAuthContext()

  const { data: projects } = useProjects()

  // Seuls les projets actifs ou draft sont affectables
  const assignableProjects = (projects ?? []).filter(
    p => p.status === 'active' || p.status === 'draft'
  )

  const [projectId,  setProjectId]  = useState('')
  const [startDate,  setStartDate]  = useState(defaultDate)
  const [endDate,    setEndDate]    = useState('')
  const [allocation, setAllocation] = useState(100)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const selectedProject = assignableProjects.find(p => p.id === projectId)

  // Quand on sélectionne un projet, on pré-remplit la date de fin
  function handleProjectChange(id: string) {
    setProjectId(id)
    setError(null)
    const proj = assignableProjects.find(p => p.id === id)
    if (proj?.endDate) setEndDate(proj.endDate)
  }

  async function handleSubmit() {
    if (!projectId)  { setError(t('errorProject'));   return }
    if (!startDate)  { setError(t('errorStartDate')); return }
    if (!endDate)    { setError(t('errorEndDate'));    return }
    if (endDate < startDate) { setError(tS('errors.dateOrder')); return }

    const companyId = user?.companyId
    if (!companyId) { setError('No company context'); return }

    setSaving(true)
    setError(null)

    try {
      await createAssignment({
        company_id:    companyId,
        consultant_id: consultant.id,
        project_id:    projectId,
        allocation,
        start_date:    startDate,
        end_date:      endDate,
      })
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 299 }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
        background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
        zIndex: 300, padding: 28, overflowY: 'auto',
        boxShadow: '-4px 0 20px var(--shadow)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
            {tS('drawer.title')}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Consultant — pré-rempli, non modifiable */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px',
          background: 'var(--bg3)', borderRadius: 4, marginBottom: 24,
          border: '1px solid var(--border)',
        }}>
          <Avatar initials={consultant.initials} color={consultant.avatarColor} size="sm" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {consultant.name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
              {consultant.role}
              {consultant.occupancyRate > 0 && (
                <span style={{ marginLeft: 8, color: consultant.occupancyRate >= 100 ? 'var(--pink)' : 'var(--gold)' }}>
                  · {consultant.occupancyRate}% {tS('drawer.occupied')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Projet */}
          <Field label={tS('drawer.project')}>
            <select
              className="search-input"
              style={{ width: '100%' }}
              value={projectId}
              onChange={e => handleProjectChange(e.target.value)}
            >
              <option value="">{tS('drawer.selectProject')}</option>
              {assignableProjects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.clientName ? ` · ${p.clientName}` : ''}
                </option>
              ))}
            </select>
            {selectedProject && (
              <div style={{
                marginTop: 6, fontSize: 10, color: 'var(--cyan)',
                letterSpacing: 1,
              }}>
                // {selectedProject.status}
                {selectedProject.endDate && ` · ${tS('drawer.projectEnd')} ${new Date(selectedProject.endDate).toLocaleDateString()}`}
              </div>
            )}
          </Field>

          {/* Dates */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label={t('startDate')} style={{ flex: 1 }}>
              <input
                type="date"
                className="search-input"
                style={{ width: '100%' }}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </Field>
            <Field label={t('endDate')} style={{ flex: 1 }}>
              <input
                type="date"
                className="search-input"
                style={{ width: '100%' }}
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </Field>
          </div>

          {/* Allocation */}
          <Field label={`${t('allocation')} — ${allocation}%`}>
            <input
              type="range"
              min={10} max={100} step={10}
              value={allocation}
              onChange={e => setAllocation(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--green)' }}
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 9, color: 'var(--text2)', marginTop: 4,
            }}>
              <span>10%</span>
              <span style={{ color: allocation >= 100 ? 'var(--green)' : 'var(--text2)' }}>
                100%
              </span>
            </div>

            {/* Avertissement surcharge */}
            {consultant.occupancyRate + allocation > 100 && (
              <div style={{
                marginTop: 8, padding: '6px 10px', borderRadius: 4,
                background: 'rgba(255,45,107,0.08)', border: '1px solid rgba(255,45,107,0.2)',
                fontSize: 10, color: 'var(--pink)',
              }}>
                ⚠ {tS('drawer.overallocation', {
                  total: consultant.occupancyRate + allocation
                })}
              </div>
            )}
          </Field>

          {/* Erreur */}
          {error && (
            <div style={{
              fontSize: 11, color: 'var(--pink)',
              padding: '8px 12px', background: 'rgba(255,45,107,0.08)', borderRadius: 4,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleSubmit}
              disabled={saving || !projectId}
            >
              {saving ? '...' : tS('drawer.submit')}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              {t('cancel')}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

function Field({ label, children, style }: {
  label: string; children: React.ReactNode; style?: React.CSSProperties
}) {
  return (
    <div style={style}>
      <div style={{
        fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
        color: 'var(--text2)', marginBottom: 6,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}