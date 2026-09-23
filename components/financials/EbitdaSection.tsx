// components/financials/EbitdaSection.tsx
'use client'

// EBITDA courant : compte de résultat mensuel (ebitda_monthly, migration 0008)
// et saisie des charges d'exploitation. Le mois en cours est proratisé côté
// base ; ici on ne fait qu'afficher et sommer.

import { useMemo, useState }  from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Panel }              from '@/components/ui/Panel'
import { KpiCard }            from '@/components/ui/KpiCard'
import { fmt }                from '@/lib/utils'
import {
  useCompanySettings, useEbitda, useOperatingExpenses, useConsultantsWithoutEntryDate,
  createOperatingExpense, deleteOperatingExpense, EXPENSE_CATEGORIES,
} from '@/lib/data'
import type { EbitdaMonth, ExpenseCategory } from '@/lib/data'

const SUM_KEYS = [
  'ca_regie', 'ca_forfait', 'ca_en_attente', 'cout_salaries', 'cout_freelances',
  'cout_honoraires', 'charges_exploitation', 'ca_total', 'ebitda',
] as const

const monthInput = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export function EbitdaSection() {
  const t      = useTranslations('financials.ebitda')
  const locale = useLocale()
  const { data: company } = useCompanySettings()
  const companyId = company?.id

  const [year,    setYear]    = useState(() => new Date().getFullYear())
  const [refresh, setRefresh] = useState(0)
  const { data: months, loading, error } = useEbitda(companyId, year, refresh)
  const { data: expenses }                = useOperatingExpenses(companyId, refresh)
  const { data: missingEntry }            = useConsultantsWithoutEntryDate(companyId, refresh)

  const totals = useMemo(() => {
    const acc = Object.fromEntries(SUM_KEYS.map(k => [k, 0])) as Record<typeof SUM_KEYS[number], number>
    for (const m of months ?? []) for (const k of SUM_KEYS) acc[k] += m[k]
    return acc
  }, [months])

  const current = months?.find(m => m.prorata < 1) ?? null
  const monthLabel = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString(locale, { month: 'short', year: '2-digit' })
  const pct = (m: Pick<EbitdaMonth, 'ebitda' | 'ca_total'>) =>
    m.ca_total > 0 ? `${Math.round((m.ebitda / m.ca_total) * 100)} %` : '—'
  const tone = (n: number) => (n < 0 ? 'var(--pink)' : n > 0 ? 'var(--green)' : 'var(--text2)')

  // ── Formulaire de charge ─────────────────────────────────────
  const [cat,     setCat]     = useState<ExpenseCategory>('locaux')
  const [label,   setLabel]   = useState('')
  const [amount,  setAmount]  = useState('')
  const [rec,     setRec]     = useState<'monthly' | 'once'>('monthly')
  const [start,   setStart]   = useState(monthInput())
  const [end,     setEnd]     = useState('')
  const [saving,  setSaving]  = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)

  const addExpense = async () => {
    if (!companyId || !label.trim() || !(Number(amount) >= 0) || amount === '') { setFormErr(t('expenses.required')); return }
    setSaving(true); setFormErr(null)
    try {
      await createOperatingExpense({
        company_id:  companyId,
        category:    cat,
        label:       label.trim(),
        amount:      Number(amount),
        recurrence:  rec,
        start_month: `${start}-01`,
        end_month:   rec === 'monthly' && end ? `${end}-01` : null,
      })
      setLabel(''); setAmount(''); setEnd('')
      setRefresh(r => r + 1)
    } catch (e) { setFormErr((e as Error).message) }
    finally { setSaving(false) }
  }

  const removeExpense = async (id: string) => {
    try { await deleteOperatingExpense(id); setRefresh(r => r + 1) }
    catch (e) { setFormErr((e as Error).message) }
  }

  const th = { textAlign: 'right' as const }
  const td = { textAlign: 'right' as const }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="label-meta">{t('title')}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setYear(y => y - 1)}>←</button>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{year}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setYear(y => y + 1)}
          disabled={year >= new Date().getFullYear()}>→</button>
      </div>

      {(missingEntry ?? 0) > 0 && (
        <p className="ts-status-msg ts-status-msg--error">{t('missingEntry', { count: missingEntry ?? 0 })}</p>
      )}
      {error && <p className="ts-status-msg ts-status-msg--error">{error}</p>}

      <div className="kpi-grid">
        <KpiCard label={t('kpi.current')}
          value={current ? fmt(current.ebitda) : '—'}
          sub={current ? t('kpi.currentSub', { pct: Math.round(current.prorata * 100) }) : t('kpi.noCurrent')}
          accent={current && current.ebitda < 0 ? 'pink' : 'green'} />
        <KpiCard label={t('kpi.ytd')}     value={fmt(totals.ebitda)}   sub={pct(totals)}  accent={totals.ebitda < 0 ? 'pink' : 'green'} />
        <KpiCard label={t('kpi.ca')}      value={fmt(totals.ca_total)} sub={t('kpi.caSub', { pending: fmt(totals.ca_en_attente) })} accent="cyan" />
        <KpiCard label={t('kpi.costs')}
          value={fmt(totals.cout_salaries + totals.cout_freelances + totals.cout_honoraires + totals.charges_exploitation)}
          sub={t('kpi.costsSub')} accent="gold" />
      </div>

      <Panel title={t('table.title')} noPadding>
        {loading ? <p className="label-meta" style={{ padding: 16 }}>{t('loading')}</p> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('table.month')}</th>
                  <th style={th}>{t('table.caRegie')}</th>
                  <th style={th}>{t('table.caForfait')}</th>
                  <th style={th}>{t('table.pending')}</th>
                  <th style={th}>{t('table.salaries')}</th>
                  <th style={th}>{t('table.freelances')}</th>
                  <th style={th}>{t('table.fees')}</th>
                  <th style={th}>{t('table.opex')}</th>
                  <th style={th}>{t('table.ebitda')}</th>
                  <th style={th}>{t('table.margin')}</th>
                </tr>
              </thead>
              <tbody>
                {(months ?? []).map(m => (
                  <tr key={m.month}>
                    <td>
                      <span className="td-primary">{monthLabel(m.month)}</span>
                      {m.prorata < 1 && <div className="td-sub">{t('table.toDate', { pct: Math.round(m.prorata * 100) })}</div>}
                    </td>
                    <td style={td}>{fmt(m.ca_regie)}</td>
                    <td style={td}>{fmt(m.ca_forfait)}</td>
                    <td style={{ ...td, color: 'var(--text2)' }}>{m.ca_en_attente ? fmt(m.ca_en_attente) : '—'}</td>
                    <td style={td}>{fmt(m.cout_salaries)}</td>
                    <td style={td}>{fmt(m.cout_freelances)}</td>
                    <td style={td}>{fmt(m.cout_honoraires)}</td>
                    <td style={td}>{fmt(m.charges_exploitation)}</td>
                    <td style={{ ...td, fontWeight: 700, color: tone(m.ebitda) }}>{fmt(m.ebitda)}</td>
                    <td style={{ ...td, color: 'var(--text2)' }}>{pct(m)}</td>
                  </tr>
                ))}
                {(months?.length ?? 0) > 1 && (
                  <tr style={{ borderTop: '1px solid var(--border2)' }}>
                    <td><span className="td-primary">{t('table.total')}</span></td>
                    <td style={td}>{fmt(totals.ca_regie)}</td>
                    <td style={td}>{fmt(totals.ca_forfait)}</td>
                    <td style={{ ...td, color: 'var(--text2)' }}>{fmt(totals.ca_en_attente)}</td>
                    <td style={td}>{fmt(totals.cout_salaries)}</td>
                    <td style={td}>{fmt(totals.cout_freelances)}</td>
                    <td style={td}>{fmt(totals.cout_honoraires)}</td>
                    <td style={td}>{fmt(totals.charges_exploitation)}</td>
                    <td style={{ ...td, fontWeight: 700, color: tone(totals.ebitda) }}>{fmt(totals.ebitda)}</td>
                    <td style={{ ...td, color: 'var(--text2)' }}>{pct(totals)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="label-meta" style={{ padding: '10px 16px' }}>{t('method')}</p>
      </Panel>

      <Panel title={t('expenses.title')}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
          <select className="search-input" value={cat} onChange={e => setCat(e.target.value as ExpenseCategory)}>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{t(`expenses.categories.${c}`)}</option>)}
          </select>
          <input className="search-input" style={{ minWidth: 180 }} placeholder={t('expenses.label')}
            value={label} onChange={e => setLabel(e.target.value)} />
          <input className="search-input" style={{ width: 120 }} type="number" min={0} step={10}
            placeholder={t('expenses.amount')} value={amount} onChange={e => setAmount(e.target.value)} />
          <select className="search-input" value={rec} onChange={e => setRec(e.target.value as 'monthly' | 'once')}>
            <option value="monthly">{t('expenses.monthly')}</option>
            <option value="once">{t('expenses.once')}</option>
          </select>
          <label className="label-meta" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rec === 'monthly' ? t('expenses.from') : t('expenses.month')}
            <input className="search-input" type="month" value={start} onChange={e => setStart(e.target.value)} />
          </label>
          {rec === 'monthly' && (
            <label className="label-meta" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {t('expenses.until')}
              <input className="search-input" type="month" value={end} onChange={e => setEnd(e.target.value)} />
            </label>
          )}
          <button className="btn btn-primary btn-sm" disabled={saving} onClick={addExpense}>{t('expenses.add')}</button>
        </div>
        {formErr && <p className="ts-status-msg ts-status-msg--error">{formErr}</p>}
        {(expenses?.length ?? 0) === 0 ? (
          <p className="label-meta">{t('expenses.empty')}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                {expenses!.map(e => (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--text2)' }}>{t(`expenses.categories.${e.category}`)}</td>
                    <td><span className="td-primary">{e.label}</span></td>
                    <td style={td}>{fmt(e.amount)}</td>
                    <td style={{ color: 'var(--text2)' }}>
                      {e.recurrence === 'monthly'
                        ? t('expenses.rangeMonthly', { from: monthLabel(e.start_month), until: e.end_month ? monthLabel(e.end_month) : '…' })
                        : t('expenses.rangeOnce', { month: monthLabel(e.start_month) })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" aria-label={t('expenses.remove')} onClick={() => removeExpense(e.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
