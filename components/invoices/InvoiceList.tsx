'use client'

import { useState }         from 'react'
import { useRouter }        from 'next/navigation'
import { useTranslations }  from 'next-intl'
import { supabase }         from '@/lib/supabase'
import { toISO }            from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

interface Invoice {
  id:                  string
  invoice_number:      string
  invoice_date:        string
  due_date:            string | null
  status:              InvoiceStatus
  subtotal:            number
  tva_rate:            number
  tva_amount:          number
  total_ttc:           number
  source_type:         string
  source_period_start: string | null
  source_period_end:   string | null
  client_name:         string | null
  project_name:        string | null
  consultant_name:     string | null
  is_overdue:          boolean
  days_overdue:        number | null
  paid_at:             string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<InvoiceStatus, { color: string; bg: string }> = {
  draft:     { color: 'var(--text2)', bg: 'rgba(255,255,255,.05)' },
  sent:      { color: 'var(--cyan)',  bg: 'rgba(0,229,255,.08)'   },
  paid:      { color: 'var(--green)', bg: 'rgba(0,255,136,.08)'   },
  overdue:   { color: 'var(--pink)',  bg: 'rgba(255,45,107,.08)'  },
  cancelled: { color: 'var(--text2)', bg: 'rgba(255,255,255,.03)' },
}

const SOURCE_ICON: Record<string, string> = {
  timesheet: '⏱',
  project:   '◧',
  manual:    '✎',
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const t = useTranslations('invoices.list.filters')
  const s = STATUS_COLORS[status]
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
      padding: '2px 8px', borderRadius: 2,
      color: s.color, background: s.bg, border: '1px solid ' + s.color + '33',
    }}>
      {t(status)}
    </span>
  )
}

function KpiCard({ label, value, sub, color = 'var(--text)' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div style={{ padding: '20px 24px', background: 'var(--bg2)',
      border: '1px solid var(--border)', borderRadius: 4 }}>
      <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 3,
        textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: -1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Mock data (replace with Supabase query) ───────────────────────────────────

const MOCK: Invoice[] = [
  {
    id: '1', invoice_number: 'NEX-2026-0003', invoice_date: '2026-03-01',
    due_date: '2026-03-31', status: 'sent', subtotal: 12000, tva_rate: 20,
    tva_amount: 2400, total_ttc: 14400, source_type: 'timesheet',
    source_period_start: '2026-02-01', source_period_end: '2026-02-28',
    client_name: 'Acme Corp', project_name: 'Site refonte 2026',
    consultant_name: 'Alice Martin', is_overdue: false, days_overdue: null, paid_at: null,
  },
  {
    id: '2', invoice_number: 'NEX-2026-0002', invoice_date: '2026-02-01',
    due_date: '2026-02-15', status: 'overdue', subtotal: 9600, tva_rate: 20,
    tva_amount: 1920, total_ttc: 11520, source_type: 'project',
    source_period_start: null, source_period_end: null,
    client_name: 'Studio Bleu', project_name: 'Branding Q1',
    consultant_name: 'David Mora', is_overdue: true, days_overdue: 18, paid_at: null,
  },
  {
    id: '3', invoice_number: 'NEX-2026-0001', invoice_date: '2026-01-15',
    due_date: '2026-02-14', status: 'paid', subtotal: 7500, tva_rate: 20,
    tva_amount: 1500, total_ttc: 9000, source_type: 'timesheet',
    source_period_start: '2026-01-01', source_period_end: '2026-01-31',
    client_name: 'NovaTech', project_name: 'API integration',
    consultant_name: 'Alice Martin', is_overdue: false, days_overdue: null, paid_at: '2026-02-10',
  },
  {
    id: '4', invoice_number: 'NEX-2026-0004', invoice_date: '2026-03-05',
    due_date: null, status: 'draft', subtotal: 4800, tva_rate: 20,
    tva_amount: 960, total_ttc: 5760, source_type: 'manual',
    source_period_start: null, source_period_end: null,
    client_name: 'Freelance client', project_name: null,
    consultant_name: 'Sophie Chen', is_overdue: false, days_overdue: null, paid_at: null,
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function InvoiceList() {
  const router  = useRouter()
  const t       = useTranslations('invoices.list')

  const [invoices,  setInvoices]  = useState<Invoice[]>(MOCK)
  const [filter,    setFilter]    = useState<InvoiceStatus | 'all'>('all')
  const [marking,   setMarking]   = useState<string | null>(null)

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)

  const totalBilled  = invoices.reduce((s, i) => s + i.total_ttc, 0)
  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_ttc, 0)
  const totalPending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total_ttc, 0)
  const overdueCount = invoices.filter(i => i.is_overdue).length

  // ── Mark as paid ──────────────────────────────────────────────
  const handleMarkPaid = async (inv: Invoice) => {
    setMarking(inv.id)
    const today = toISO(new Date())
    try {
      // Optimistic update
      setInvoices(prev => prev.map(i =>
        i.id === inv.id
          ? { ...i, status: 'paid' as InvoiceStatus, paid_at: today, is_overdue: false, days_overdue: null }
          : i
      ))

      await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: today })
        .eq('id', inv.id)
    } catch {
      // Rollback on error
      setInvoices(prev => prev.map(i =>
        i.id === inv.id ? inv : i
      ))
    } finally {
      setMarking(null)
    }
  }

  // ── Can mark as paid? ─────────────────────────────────────────
  const canMarkPaid = (inv: Invoice) => inv.status === 'sent' || inv.status === 'overdue'

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KpiCard
          label={t('kpi.totalBilled')}
          value={fmt(totalBilled)}
          sub={t('kpi.invoiceCount', { count: invoices.length })}
        />
        <KpiCard
          label={t('kpi.collected')}
          value={fmt(totalPaid)}
          color="var(--green)"
        />
        <KpiCard
          label={t('kpi.pending')}
          value={fmt(totalPending)}
          color="var(--cyan)"
          sub={t('kpi.awaitingPayment')}
        />
        <KpiCard
          label={t('kpi.overdue')}
          value={String(overdueCount)}
          color={overdueCount > 0 ? 'var(--pink)' : 'var(--text2)'}
          sub={overdueCount > 0 ? t('kpi.requiresAction') : t('kpi.allGood')}
        />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map(s => {
            const color  = s !== 'all' ? STATUS_COLORS[s].color : 'var(--text)'
            const active = filter === s
            return (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '5px 12px', borderRadius: 3, fontSize: 10, cursor: 'pointer',
                fontFamily: 'var(--font-mono, monospace)', letterSpacing: 1, textTransform: 'uppercase',
                border:     active ? '1px solid ' + color : '1px solid var(--border)',
                background: active ? 'var(--bg3)' : 'none',
                color:      active ? color : 'var(--text2)',
              }}>
                {t(`filters.${s}`)}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => router.push('/invoices/new')}
          style={{
            background: 'var(--green)', color: '#060a06', border: 'none',
            padding: '8px 20px', borderRadius: 3, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--font-mono, monospace)', letterSpacing: 1,
          }}>
          {t('cta')}
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('table.number')}</th>
              <th>{t('table.client')}</th>
              <th>{t('table.project')}</th>
              <th>{t('table.date')}</th>
              <th>{t('table.due')}</th>
              <th style={{ textAlign: 'right' }}>{t('table.subtotal')}</th>
              <th style={{ textAlign: 'right' }}>{t('table.vat')}</th>
              <th style={{ textAlign: 'right' }}>{t('table.total')}</th>
              <th>{t('table.status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id}>

                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span className="td-primary">{inv.invoice_number}</span>
                    <span style={{ fontSize: 9, color: 'var(--text2)' }}>
                      {SOURCE_ICON[inv.source_type] ?? '—'} {inv.source_type}
                      {inv.source_period_start && (' · ' + fmtDate(inv.source_period_start))}
                    </span>
                  </div>
                </td>

                <td style={{ color: inv.client_name ? 'var(--text)' : 'var(--text2)' }}>
                  {inv.client_name ?? '—'}
                </td>

                <td style={{ color: inv.project_name ? 'var(--cyan)' : 'var(--text2)', fontSize: 11 }}>
                  {inv.project_name ?? '—'}
                </td>

                <td style={{ color: 'var(--text2)', fontSize: 11 }}>
                  {fmtDate(inv.invoice_date)}
                </td>

                <td>
                  {inv.due_date ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{
                        fontSize: 11,
                        color:      inv.is_overdue ? 'var(--pink)' : 'var(--text2)',
                        fontWeight: inv.is_overdue ? 700 : 400,
                      }}>
                        {fmtDate(inv.due_date)}
                      </span>
                      {inv.is_overdue && (
                        <span style={{ fontSize: 9, color: 'var(--pink)' }}>
                          {t('overdueBadge', { days: inv.days_overdue ?? 0 })}
                        </span>
                      )}
                      {inv.paid_at && (
                        <span style={{ fontSize: 9, color: 'var(--green)' }}>
                          {t('paidBadge', { date: fmtDate(inv.paid_at) })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text2)', opacity: 0.4 }}>—</span>
                  )}
                </td>

                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
                  {fmt(inv.subtotal)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--text2)' }}>
                  {fmt(inv.tva_amount)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontSize: 13, fontWeight: 700 }}>
                  {fmt(inv.total_ttc)}
                </td>

                <td><StatusBadge status={inv.status} /></td>

                {/* Actions — Mark as paid + preview + PDF */}
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {canMarkPaid(inv) && (
                      <button
                        onClick={() => handleMarkPaid(inv)}
                        disabled={marking === inv.id}
                        style={{
                          background: 'rgba(0,255,136,.08)', border: '1px solid rgba(0,255,136,.3)',
                          color: 'var(--green)', fontSize: 9, padding: '3px 8px',
                          borderRadius: 2, cursor: 'pointer',
                          fontFamily: 'var(--font-mono, monospace)', fontWeight: 700,
                          opacity: marking === inv.id ? 0.5 : 1,
                        }}
                      >
                        {marking === inv.id ? '···' : t('actions.markPaid')}
                      </button>
                    )}
                    <button
                      disabled
                      title="Coming soon"
                      style={{
                        background: 'none', border: '1px solid var(--border)',
                        color: 'var(--text2)', fontSize: 9, padding: '3px 8px',
                        borderRadius: 2, cursor: 'not-allowed', opacity: 0.3,
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    >
                      {t('actions.pdf')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text2)', fontSize: 12 }}>
          {t('empty')}
        </div>
      )}
    </>
  )
}