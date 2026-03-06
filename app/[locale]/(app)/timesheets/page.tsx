'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations, useLocale }                from 'next-intl'
import { Topbar }                                    from '@/components/layout/Topbar'
import { Panel, StatRow }                            from '@/components/ui'
import { Avatar }                                    from '@/components/ui/Avatar'
import {
  useTimesheets,
  useConsultants,
  useConsultantProjectsMap,
  useInternalProjectTypes,
  useApprovedLeavesForWeek,
  useCompanySettings,
  upsertTimesheet,
  submitTimesheets,
  approveTimesheets,
} from '@/lib/data'
import type { Timesheet, LeaveOverlay } from '@/lib/data'
import { useAuthContext }   from '@/components/layout/AuthProvider'
import { useActiveTenant }  from '@/lib/tenant-context'
import { isAdmin, canEdit } from '@/lib/auth'

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function fmtDay(d: Date) {
  return {
    dow: d.toLocaleDateString('en', { weekday: 'short' }),
    num: d.toLocaleDateString('en', { day: 'numeric', month: 'short' }),
  }
}

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type TSStatus = 'draft' | 'submitted' | 'approved'

interface HolidayEntry {
  date:      string  // YYYY-MM-DD
  localName: string
}

// Map : countryCode → HolidayEntry[]
type HolidayMap = Record<string, HolidayEntry[]>

// ══════════════════════════════════════════════════════════════
// COLORS
// ══════════════════════════════════════════════════════════════

function valueColor(v?: number) {
  if (!v) return 'var(--text3)'
  if (v < 1) return 'var(--gold)'
  return 'var(--green)'
}

function dotColor(s: TSStatus) {
  if (s === 'approved') return 'var(--green)'
  if (s === 'submitted') return 'var(--gold)'
  return 'var(--text3)'
}

// ══════════════════════════════════════════════════════════════
// PILL — statut timesheet
// ══════════════════════════════════════════════════════════════

function Pill({ status }: { status: TSStatus }) {
  const cfg: Record<TSStatus, { bg: string; color: string }> = {
    draft:     { bg: 'rgba(100,100,100,.2)',    color: 'var(--text3)' },
    submitted: { bg: 'rgba(255,209,102,.15)',   color: 'var(--gold)' },
    approved:  { bg: 'rgba(0,255,136,.12)',     color: 'var(--green)' },
  }
  return (
    <span style={{
      fontSize: 9, fontWeight: 700,
      letterSpacing: '.06em', textTransform: 'uppercase',
      padding: '2px 6px', borderRadius: 4,
      ...cfg[status],
    }}>
      {status}
    </span>
  )
}

// ══════════════════════════════════════════════════════════════
// LEAVE BADGE — affiché dans les cellules congés approuvés
// ══════════════════════════════════════════════════════════════

function LeaveBadge({ type }: { type: string }) {
  const short: Record<string, string> = {
    'CP': 'CP', 'RTT': 'RTT',
    'Sans solde': 'SLD', 'Absence autorisée': 'ABS',
  }
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 2,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 1,
        color: 'var(--cyan)',
        background: 'rgba(0,229,255,.1)',
        border: '1px solid rgba(0,229,255,.25)',
        borderRadius: 3, padding: '1px 5px',
      }}>
        {short[type] ?? type}
      </div>
      <div style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: 0.5 }}>congé</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// HOLIDAY BADGE — affiché dans les cellules jours fériés
// ══════════════════════════════════════════════════════════════

function HolidayBadge({ name }: { name: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 2,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700,
        color: 'var(--gold)',
        background: 'rgba(255,209,102,.1)',
        border: '1px solid rgba(255,209,102,.25)',
        borderRadius: 3, padding: '1px 5px',
        maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        ◈ férié
      </div>
      <div style={{
        fontSize: 7, color: 'var(--text3)', letterSpacing: 0.3,
        maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: 'center',
      }}>
        {name}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// CELL EDITOR — popup de saisie
// ══════════════════════════════════════════════════════════════

interface CellEditorProps {
  entry:        Timesheet | undefined
  projects:     { id: string; name: string }[]
  canEditEntry: boolean
  x:            number
  y:            number
  onSave:       (value: number, projectId: string) => void
  onClose:      () => void
}

const VALUES = [
  { label: '—', v: 0 },
  { label: '½', v: 0.5 },
  { label: '1', v: 1 },
]

function CellEditor({ entry, projects, canEditEntry, x, y, onSave, onClose }: CellEditorProps) {
  const [val,  setVal]  = useState(entry?.value ?? 0)
  const [proj, setProj] = useState(entry?.projectId ?? projects[0]?.id ?? '')

  useEffect(() => { setVal(entry?.value ?? 0) }, [entry?.value])
  useEffect(() => { setProj(entry?.projectId ?? projects[0]?.id ?? '') }, [entry?.projectId, projects])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const safeX = Math.min(x, window.innerWidth  - 200)
  const safeY = Math.min(y, window.innerHeight - 210)

  const popupStyle: React.CSSProperties = {
    position: 'fixed', top: safeY, left: safeX, zIndex: 1000,
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 12, minWidth: 180,
    boxShadow: '0 8px 32px rgba(0,0,0,.55)',
  }

  if (!canEditEntry) {
    return (
      <div style={popupStyle}>
        <Pill status={entry?.status ?? 'draft'} />
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8 }}>
          {entry?.projectId ?? '—'}
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: 10, width: '100%', background: 'var(--bg3)',
            border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text2)', fontSize: 10, padding: '5px 0', cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <div style={popupStyle}>
      {/* Sélecteur valeur */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {VALUES.map(({ label, v }) => (
          <button
            key={v}
            onClick={() => setVal(v)}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 6, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
              background: val === v ? 'var(--green)' : 'var(--bg3)',
              color: val === v ? '#000' : 'var(--text2)',
              border: val === v ? '1px solid var(--green)' : '1px solid var(--border)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sélecteur projet */}
      {projects.length > 0 && (
        <select
          value={proj}
          onChange={e => setProj(e.target.value)}
          style={{
            width: '100%', background: 'var(--bg3)',
            border: '1px solid var(--border2)',
            color: 'var(--text)', padding: '6px 8px',
            borderRadius: 4, fontSize: 11,
            fontFamily: 'inherit', marginBottom: 10,
          }}
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => { onSave(val, proj); onClose() }}
          style={{
            flex: 1, background: 'var(--green)', color: '#000',
            border: 'none', borderRadius: 6, padding: '6px 0',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Save
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1, background: 'var(--bg3)', color: 'var(--text2)',
            border: '1px solid var(--border)', borderRadius: 6,
            padding: '6px 0', fontSize: 11, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function TimesheetsPage() {
  const t              = useTranslations('timesheets')
  const locale         = useLocale()
  const { user }       = useAuthContext()
  const { activeTenantId } = useActiveTenant()

  const role          = user?.role ?? 'consultant'
  const currentUserId = user?.id ?? null
  const isConsultant  = role === 'consultant' || role === 'freelance'

  // ── Navigation semaine ───────────────────────────────────
  const [monday, setMonday] = useState(() => getMondayOf(new Date()))
  const days       = useMemo(() => getWeekDays(monday), [monday])
  const weekStart  = useMemo(() => toISO(monday), [monday])
  const weekEnd    = useMemo(() => toISO(days[4]), [days])
  const isThisWeek = toISO(getMondayOf(new Date())) === toISO(monday)

  const prevWeek = () => setMonday(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextWeek = () => setMonday(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  const goToday  = () => setMonday(getMondayOf(new Date()))

  // ── Données Supabase ─────────────────────────────────────
  const { data: timesheets,   loading, error }  = useTimesheets(monday)
  const { data: consultants }                   = useConsultants()
  const { data: projectsMap }                   = useConsultantProjectsMap()
  const { data: internalTypes }                 = useInternalProjectTypes()
  const { data: companyData }                   = useCompanySettings()
  const { data: approvedLeaves }                = useApprovedLeavesForWeek(weekStart, weekEnd)

  const consultantsSafe   = consultants ?? []
  const consultantsLoaded = Array.isArray(consultants)
  const projectsLoaded    = typeof projectsMap !== 'undefined'

  // ── Pays par défaut de la company ────────────────────────
  const companyCountry = useMemo(
    () => (companyData?.hr_settings as any)?.country_code ?? 'FR',
    [companyData]
  )

  // ── Fetch jours fériés depuis Nager — un par pays unique ─
  const [holidayMap, setHolidayMap] = useState<HolidayMap>({})

  useEffect(() => {
    if (!consultantsSafe.length) return

    // Collecter tous les pays uniques (consultant.country_code ou fallback company)
    const countries = new Set<string>()
    countries.add(companyCountry)
    for (const c of consultantsSafe) {
      if (c.country_code) countries.add(c.country_code)
    }

    const year = monday.getFullYear()

    Promise.all(
      Array.from(countries).map(async cc => {
        try {
          const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${cc}`)
          const data: HolidayEntry[] = await r.json()
          return [cc, Array.isArray(data) ? data : []] as [string, HolidayEntry[]]
        } catch {
          return [cc, []] as [string, HolidayEntry[]]
        }
      })
    ).then(results => {
      const map: HolidayMap = {}
      for (const [cc, entries] of results) map[cc] = entries
      setHolidayMap(map)
    })
  }, [companyCountry, consultantsSafe, monday.getFullYear()])

  // ── Helper : est-ce un jour férié pour un consultant ? ───
  const getHoliday = useCallback((consultantCountry: string | null | undefined, dateStr: string): HolidayEntry | undefined => {
    const cc = consultantCountry ?? companyCountry
    return holidayMap[cc]?.find(h => h.date === dateStr)
  }, [holidayMap, companyCountry])

  // ── Leave overlay map : consultantId__date → LeaveOverlay
  const leaveOverlayMap = useMemo(() => {
    const map: Record<string, LeaveOverlay> = {}
    for (const l of (approvedLeaves ?? [])) {
      map[`${l.consultantId}__${l.date}`] = l
    }
    return map
  }, [approvedLeaves])

  // ── Projets internes dédoublonnés ────────────────────────
  const systemProjects = useMemo(() => {
    const seen = new Set<string>()
    return (internalTypes ?? []).filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }, [internalTypes])

  // ── Optimistic local state ────────────────────────────────
  const [localEntries, setLocalEntries] = useState<Record<string, Timesheet>>({})

  useEffect(() => {
    setLocalEntries({})
    setPopup(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  // ── Popup ─────────────────────────────────────────────────
  const [popup, setPopup] = useState<{
    consultantId: string
    date:         string
    x:            number
    y:            number
  } | null>(null)

  useEffect(() => {
    if (!popup) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.ts-popup-fixed') && !target.closest('.ts-cell')) setPopup(null)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [popup])

  // ── Merged lookup ────────────────────────────────────────
  const lookup = useMemo(() => {
    const map: Record<string, Timesheet> = {}
    ;(timesheets ?? []).forEach(ts => { map[`${ts.consultantId}__${ts.date}`] = ts })
    Object.assign(map, localEntries)
    return map
  }, [timesheets, localEntries])

  // ── Stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = Object.values(lookup)
    const daysCount = all.reduce((s, ts) => s + (ts.value ?? 0), 0)
    return [
      { value: daysCount.toFixed(1),                                    label: t('stats.totalDays'), color: 'var(--cyan)' },
      { value: all.filter(ts => ts.status === 'draft').length,          label: t('stats.draft'),     color: 'var(--text2)' },
      { value: all.filter(ts => ts.status === 'submitted').length,      label: t('stats.submitted'), color: 'var(--gold)' },
      { value: all.filter(ts => ts.status === 'approved').length,       label: t('stats.approved'),  color: 'var(--green)' },
    ]
  }, [lookup, t])

  // ── Consultants visibles selon rôle ──────────────────────
  const visibleConsultants = useMemo(() => {
    if (!consultantsLoaded) return []
    if (role === 'consultant') {
      if (!currentUserId) return []
      return consultantsSafe.filter(c => c.user_id === currentUserId)
    }
    return consultantsSafe
  }, [consultantsLoaded, consultantsSafe, role, currentUserId])

  // ── Save handler (optimistic) ────────────────────────────
  const handleSave = useCallback(async (
    consultantId: string,
    date:         string,
    value:        number,
    projectId:    string,
  ) => {
    const key = `${consultantId}__${date}`
    setLocalEntries(prev => ({
      ...prev,
      [key]: { id: prev[key]?.id ?? `local-${key}`, consultantId, projectId, date, value, status: 'draft' },
    }))
    try {
      const saved = await upsertTimesheet({ consultantId, date, value, projectId })
      setLocalEntries(prev => ({ ...prev, [key]: saved }))
    } catch (e) {
      console.error('upsertTimesheet error:', e)
      setLocalEntries(prev => { const n = { ...prev }; delete n[key]; return n })
    }
  }, [])

  // ── Submit / Approve ─────────────────────────────────────
  const handleSubmitAll = useCallback(async (consultantId: string) => {
    const draftIds = Object.values(lookup)
      .filter(ts => ts.consultantId === consultantId && ts.status === 'draft')
      .map(ts => ts.id).filter(id => !id.startsWith('local-'))
    if (!draftIds.length) return
    await submitTimesheets(draftIds)
    setLocalEntries(prev => {
      const updated = { ...prev }
      for (const ts of Object.values(lookup)) {
        if (ts.consultantId === consultantId && ts.status === 'draft')
          updated[`${ts.consultantId}__${ts.date}`] = { ...ts, status: 'submitted' }
      }
      return updated
    })
  }, [lookup])

  const handleApproveAll = useCallback(async (consultantId: string) => {
    const submittedIds = Object.values(lookup)
      .filter(ts => ts.consultantId === consultantId && ts.status === 'submitted')
      .map(ts => ts.id).filter(id => !id.startsWith('local-'))
    if (!submittedIds.length) return
    await approveTimesheets(submittedIds)
    setLocalEntries(prev => {
      const updated = { ...prev }
      for (const ts of Object.values(lookup)) {
        if (ts.consultantId === consultantId && ts.status === 'submitted')
          updated[`${ts.consultantId}__${ts.date}`] = { ...ts, status: 'approved' }
      }
      return updated
    })
  }, [lookup])

  const consultantDataReady = !isConsultant || (!!currentUserId && consultantsLoaded && projectsLoaded)

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      {/* ── Styles CRA ─────────────────────────────────────────── */}
      <style>{`
        .ts-table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--font-mono);
          font-size: 12px;
        }
        .ts-table th {
          padding: 6px 8px;
          color: var(--text3);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          border-bottom: 1px solid var(--border);
          background: var(--bg2);
        }
        .ts-table td {
          padding: 4px 4px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .ts-table tbody tr:hover td {
          background: var(--bg3);
        }

        /* ── Cellule standard ── */
        .ts-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 72px;
          height: 48px;
          margin: 0 auto;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--bg3);
          cursor: pointer;
          transition: border-color .12s, background .12s;
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 700;
        }
        .ts-cell:hover {
          border-color: var(--cyan);
          background: var(--bg4);
        }
        .ts-cell--empty {
          color: var(--text3);
          font-size: 16px;
          font-weight: 400;
          border-style: dashed;
        }
        .ts-cell--empty:hover {
          color: var(--cyan);
          border-style: solid;
        }
        .ts-cell--filled {
          border-color: var(--border2);
        }
        .ts-cell--holiday {
          width: 72px;
          height: 48px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: 1px solid rgba(255,209,102,.25);
          background: rgba(255,209,102,.06);
        }
        .ts-cell--leave {
          width: 72px;
          height: 48px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: 1px solid rgba(0,229,255,.2);
          background: rgba(0,229,255,.05);
        }

        /* ── Dot statut (coin bas-droit) ── */
        .ts-status-dot {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        /* ── Popup overlay ── */
        .ts-popup-fixed {
          position: fixed;
          z-index: 1000;
        }
      `}</style>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">
        <StatRow stats={stats} />

        {/* Navigation semaine */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={prevWeek}>← {t('prevWeek')}</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
            {t('weekOf')} {monday.toLocaleDateString(locale === 'fr' ? 'fr' : 'en', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <button className="btn btn-ghost" onClick={nextWeek}>{t('nextWeek')} →</button>
          {!isThisWeek && (
            <button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={goToday}>
              {t('today')}
            </button>
          )}
        </div>

        {loading && <p style={{ color: 'var(--text3)', fontSize: 12 }}>// loading…</p>}
        {error   && <p style={{ color: 'var(--pink)' }}>{error}</p>}

        {/* Légende */}
        <div style={{
          display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap',
          fontSize: 10, color: 'var(--text3)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: 2,
              background: 'rgba(0,229,255,.15)', border: '1px solid rgba(0,229,255,.3)',
            }} />
            Congé approuvé
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: 2,
              background: 'rgba(255,209,102,.15)', border: '1px solid rgba(255,209,102,.3)',
            }} />
            Jour férié
          </span>
        </div>

        {!consultantDataReady && (
          <Panel>
            <div style={{ padding: 18, color: 'var(--text3)', fontSize: 12 }}>
              // loading your profile & assignments…
            </div>
          </Panel>
        )}

        {/* Grille */}
        {!loading && consultantDataReady && (
          <Panel>
            <div style={{ overflowX: 'auto' }}>
              <table className="ts-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 190, textAlign: 'left' }}>{t('table.consultant')}</th>
                    {days.map(d => {
                      const { dow, num } = fmtDay(d)
                      const dateStr = toISO(d)
                      const today   = dateStr === toISO(new Date())
                      return (
                        <th key={dateStr} style={{ textAlign: 'center', minWidth: 86 }}>
                          <div style={{ color: today ? 'var(--cyan)' : 'var(--text2)', fontSize: 10, fontWeight: 600 }}>{dow}</div>
                          <div style={{ color: today ? 'var(--cyan)' : 'var(--text1)', fontSize: 12, fontWeight: 700 }}>{num}</div>
                        </th>
                      )
                    })}
                    <th style={{ textAlign: 'center', minWidth: 80 }}>{t('table.total')}</th>
                    <th style={{ textAlign: 'center', minWidth: 110 }}>{t('table.actions')}</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleConsultants.map(c => {
                    const consultantProjects = [
                      ...(projectsMap?.[c.id] ?? []),
                      ...systemProjects,
                    ]

                    const rowEntries   = Object.values(lookup).filter(ts => ts.consultantId === c.id)
                    const weekTotal    = rowEntries.reduce((s, ts) => s + (ts.value ?? 0), 0)
                    const hasDraft     = rowEntries.some(ts => ts.status === 'draft' && (ts.value ?? 0) > 0)
                    const hasSubmitted = rowEntries.some(ts => ts.status === 'submitted')
                    const rowStatus: TSStatus = hasDraft ? 'draft' : hasSubmitted ? 'submitted' : 'approved'
                    const isSelf = isConsultant && c.user_id === currentUserId

                    return (
                      <tr key={c.id}>
                        {/* Consultant */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{c.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                                {c.role}
                                {c.country_code && c.country_code !== companyCountry && (
                                  <span style={{ marginLeft: 6, opacity: 0.6 }}>· {c.country_code}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cellules jours */}
                        {days.map(d => {
                          const dateStr  = toISO(d)
                          const key      = `${c.id}__${dateStr}`
                          const entry    = lookup[key]
                          const isOpen   = popup?.consultantId === c.id && popup?.date === dateStr

                          // Overlay congé approuvé
                          const leaveOverlay = leaveOverlayMap[key]

                          // Jour férié selon pays du consultant (fallback company)
                          const holiday = getHoliday(c.country_code, dateStr)

                          // Règles d'édition
                          const entryIsDraft = !entry || entry.status === 'draft'
                          const adminCanEdit = isAdmin(role)
                          // Un congé ou férié peut être écrasé par l'admin uniquement
                          const cellLocked   = (leaveOverlay || holiday) && !adminCanEdit
                          const canEditCell  = !cellLocked && (canEdit(role) || (isSelf && entryIsDraft))
                          const disabled     = (isConsultant && !isSelf) || cellLocked

                          // Fond de cellule selon type
                          const cellBg = holiday
                            ? 'rgba(255,209,102,.08)'
                            : leaveOverlay
                            ? 'rgba(0,229,255,.06)'
                            : undefined

                          return (
                            <td
                              key={dateStr}
                              style={{
                                textAlign: 'center', position: 'relative',
                                background: cellBg,
                              }}
                            >
                              {/* Contenu de la cellule */}
                              {holiday && !entry ? (
                                // Jour férié sans saisie : badge non-cliquable (ou cliquable admin)
                                adminCanEdit ? (
                                  <button
                                    className="ts-cell ts-cell--holiday"
                                    style={{ opacity: 0.85 }}
                                    title={holiday.localName}
                                    onClick={e => {
                                      if (isOpen) { setPopup(null); return }
                                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                      setPopup({ consultantId: c.id, date: dateStr, x: rect.left, y: rect.bottom + 6 })
                                    }}
                                  >
                                    <HolidayBadge name={holiday.localName} />
                                  </button>
                                ) : (
                                  <div className="ts-cell ts-cell--holiday" title={holiday.localName} style={{ cursor: 'default' }}>
                                    <HolidayBadge name={holiday.localName} />
                                  </div>
                                )
                              ) : leaveOverlay && !entry ? (
                                // Congé approuvé sans saisie : badge pré-rempli
                                adminCanEdit ? (
                                  <button
                                    className="ts-cell ts-cell--leave"
                                    style={{ opacity: 0.9 }}
                                    title={`Congé ${leaveOverlay.type} approuvé`}
                                    onClick={e => {
                                      if (isOpen) { setPopup(null); return }
                                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                      setPopup({ consultantId: c.id, date: dateStr, x: rect.left, y: rect.bottom + 6 })
                                    }}
                                  >
                                    <LeaveBadge type={leaveOverlay.type} />
                                  </button>
                                ) : (
                                  <div className="ts-cell ts-cell--leave" title={`Congé ${leaveOverlay.type} approuvé`} style={{ cursor: 'default' }}>
                                    <LeaveBadge type={leaveOverlay.type} />
                                  </div>
                                )
                              ) : (
                                // Cellule normale
                                <button
                                  className={`ts-cell ${entry ? 'ts-cell--filled' : 'ts-cell--empty'}`}
                                  style={{
                                    color: valueColor(entry?.value),
                                    opacity: disabled ? 0.4 : 1,
                                  }}
                                  onClick={e => {
                                    if (disabled) return
                                    if (isOpen) { setPopup(null); return }
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                    setPopup({ consultantId: c.id, date: dateStr, x: rect.left, y: rect.bottom + 6 })
                                  }}
                                  title={entry?.status ?? 'No entry'}
                                  disabled={disabled}
                                >
                                  {entry
                                    ? (entry.value === 1 ? '1' : entry.value === 0.5 ? '½' : '—')
                                    : '+'}
                                  {entry && <span className="ts-status-dot" style={{ background: dotColor(entry.status) }} />}
                                </button>
                              )}

                              {/* Popup */}
                              {isOpen && (
                                <div className="ts-popup-fixed">
                                  <CellEditor
                                    entry={entry}
                                    projects={consultantProjects}
                                    canEditEntry={canEditCell}
                                    x={popup!.x}
                                    y={popup!.y}
                                    onSave={(val, proj) => handleSave(c.id, dateStr, val, proj)}
                                    onClose={() => setPopup(null)}
                                  />
                                </div>
                              )}
                            </td>
                          )
                        })}

                        {/* Total semaine */}
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                            color: weekTotal >= 5 ? 'var(--green)' : weekTotal > 0 ? 'var(--gold)' : 'var(--text3)',
                          }}>
                            {weekTotal > 0 ? weekTotal.toFixed(1) : '—'}
                          </span>
                          {rowEntries.length > 0 && (
                            <div style={{ marginTop: 3 }}><Pill status={rowStatus} /></div>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                            {hasDraft && (canEdit(role) || (isConsultant && isSelf)) && (
                              <button
                                className="btn btn-ghost"
                                style={{ fontSize: 10, padding: '2px 8px', color: 'var(--cyan)', whiteSpace: 'nowrap' }}
                                onClick={() => handleSubmitAll(c.id)}
                              >
                                {t('actions.submit')}
                              </button>
                            )}
                            {hasSubmitted && isAdmin(role) && (
                              <button
                                className="btn btn-ghost"
                                style={{ fontSize: 10, padding: '2px 8px', color: 'var(--green)', whiteSpace: 'nowrap' }}
                                onClick={() => handleApproveAll(c.id)}
                              >
                                {t('actions.approve')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {visibleConsultants.length === 0 && (
                    <tr>
                      <td colSpan={days.length + 3} style={{
                        textAlign: 'center', color: 'var(--text3)',
                        fontSize: 12, padding: '32px 0',
                      }}>
                        // no consultants
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </>
  )
}