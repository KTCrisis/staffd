'use client'

// ══════════════════════════════════════════════════════════════
// components/settings/GradesTab.tsx
// Grille par grade : TJM cible, occupation cible, coût chargé annuel.
// Les colonnes calculées (CA, contribution, points morts) viennent de
// lib/grades.ts ; les jours travaillés, des réglages RH.
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { useTranslations }  from 'next-intl'
import { useActiveTenant }  from '@/lib/tenant-context'
import { useCompanySettings, useGrades, saveGrades, seedDefaultGrades } from '@/lib/data'
import type { GradeDraft, GradeRow } from '@/lib/data'
import { gradeEconomics }   from '@/lib/grades'
import { fmt, fmtTjm }      from '@/lib/utils'
import { SectionLabel, SaveBar, Skeleton, ErrorBanner } from './shared'

const cell = {
  width: '100%', background: 'var(--bg3)',
  border: '1px solid var(--border2)', color: 'var(--text)',
  padding: '6px 8px', borderRadius: 2,
  fontSize: 12, fontFamily: 'inherit',
}
const num = { ...cell, textAlign: 'right' as const }

type Row = { id?: string; label: string; tjm: string; occ: string; cost: string }

const toRow = (g: GradeRow): Row => ({
  id:    g.id,
  label: g.label,
  tjm:   g.tjm_cible?.toString()          ?? '',
  occ:   g.occupation_cible?.toString()   ?? '',
  cost:  g.cout_annuel_charge?.toString() ?? '',
})

const orNull = (s: string) => (s.trim() === '' ? null : Number(s))

export function GradesTab() {
  const t = useTranslations('settings.grades')
  const { activeTenantId } = useActiveTenant()
  const [refresh, setRefresh] = useState(0)
  const { data: grades, loading } = useGrades(refresh)
  const { data: company } = useCompanySettings()
  const jours = company?.hr_settings.working_days_per_year ?? 218

  const [rows,    setRows]    = useState<Row[]>([])
  const [removed, setRemoved] = useState<string[]>([])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const reset = () => { setRows((grades ?? []).map(toRow)); setRemoved([]) }
  useEffect(reset, [grades])

  const dirty = useMemo(() => {
    const base = (grades ?? []).map(toRow)
    return removed.length > 0 || JSON.stringify(base) !== JSON.stringify(rows)
  }, [grades, rows, removed])

  const set = (i: number, k: keyof Row, v: string) =>
    setRows(rs => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)))

  const remove = (i: number) => {
    const r = rows[i]
    if (r.id) setRemoved(ids => [...ids, r.id!])
    setRows(rs => rs.filter((_, j) => j !== i))
  }

  const move = (i: number, d: -1 | 1) => setRows(rs => {
    const j = i + d
    if (j < 0 || j >= rs.length) return rs
    const next = [...rs]; [next[i], next[j]] = [next[j], next[i]]
    return next
  })

  const run = async (fn: () => Promise<void>) => {
    setSaving(true); setError(null)
    try { await fn(); setRefresh(r => r + 1) }
    catch (e) { setError((e as Error).message) }
    finally { setSaving(false) }
  }

  const handleSave = () => {
    if (rows.some(r => !r.label.trim())) { setError(t('labelRequired')); return }
    const drafts: GradeDraft[] = rows.map((r, i) => ({
      id:                 r.id,
      label:              r.label.trim(),
      position:           i,
      tjm_cible:          orNull(r.tjm),
      occupation_cible:   orNull(r.occ),
      cout_annuel_charge: orNull(r.cost),
    }))
    run(() => saveGrades(drafts, removed, activeTenantId ?? undefined))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <ErrorBanner message={error} />
      <section>
        <SectionLabel label={t('section')} />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>{t('note', { jours })}</div>

          {loading ? <Skeleton h={160} /> : rows.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{t('empty')}</span>
              <button className="btn btn-sm btn-primary" disabled={saving}
                onClick={() => run(() => seedDefaultGrades(activeTenantId ?? undefined))}>
                {t('seed')}
              </button>
              <button className="btn btn-sm btn-ghost"
                onClick={() => setRows([{ label: '', tjm: '', occ: '', cost: '' }])}>
                {t('add')}
              </button>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', minWidth: 860 }}>
                  <thead>
                    <tr>
                      <th />
                      <th style={{ textAlign: 'left' }}>{t('cols.label')}</th>
                      <th style={{ textAlign: 'right' }}>{t('cols.tjm')}</th>
                      <th style={{ textAlign: 'right' }}>{t('cols.occ')}</th>
                      <th style={{ textAlign: 'right' }}>{t('cols.cost')}</th>
                      <th style={{ textAlign: 'right' }}>{t('cols.ca')}</th>
                      <th style={{ textAlign: 'right' }}>{t('cols.contribution')}</th>
                      <th style={{ textAlign: 'right' }}>{t('cols.pmTjm')}</th>
                      <th style={{ textAlign: 'right' }}>{t('cols.pmOcc')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const e = gradeEconomics({
                        tjm: Number(r.tjm) || 0, occupation: Number(r.occ) || 0,
                        cost: Number(r.cost) || 0, jours,
                      })
                      return (
                        <tr key={r.id ?? `new-${i}`}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn btn-sm btn-ghost" aria-label={t('up')} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                            <button className="btn btn-sm btn-ghost" aria-label={t('down')} onClick={() => move(i, 1)} disabled={i === rows.length - 1}>↓</button>
                          </td>
                          <td style={{ minWidth: 140 }}>
                            <input style={cell} value={r.label} onChange={ev => set(i, 'label', ev.target.value)} />
                          </td>
                          <td style={{ width: 90 }}>
                            <input style={num} type="number" min={0} step={10} value={r.tjm} onChange={ev => set(i, 'tjm', ev.target.value)} />
                          </td>
                          <td style={{ width: 70 }}>
                            <input style={num} type="number" min={0} max={100} step={1} value={r.occ} onChange={ev => set(i, 'occ', ev.target.value)} />
                          </td>
                          <td style={{ width: 110 }}>
                            <input style={num} type="number" min={0} step={1000} value={r.cost} onChange={ev => set(i, 'cost', ev.target.value)} />
                          </td>
                          <td style={{ textAlign: 'right' }}>{e ? fmt(e.caAnnuel) : '—'}</td>
                          <td style={{ textAlign: 'right', color: e && e.contribution < 0 ? 'var(--pink)' : 'var(--green)' }}>
                            {e ? fmt(e.contribution) : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>{e?.pointMortTjm != null ? fmtTjm(e.pointMortTjm) : '—'}</td>
                          <td style={{ textAlign: 'right' }}>{e?.pointMortOccupation != null ? `${e.pointMortOccupation.toFixed(0)} %` : '—'}</td>
                          <td>
                            <button className="btn btn-sm btn-ghost" aria-label={t('remove')} onClick={() => remove(i)}>✕</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div>
                <button className="btn btn-sm btn-ghost"
                  onClick={() => setRows(rs => [...rs, { label: '', tjm: '', occ: '', cost: '' }])}>
                  {t('add')}
                </button>
              </div>
            </>
          )}
          <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onReset={reset} />
        </div>
      </section>
    </div>
  )
}
