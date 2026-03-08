'use client'

import { useState, useEffect }  from 'react'
import { useRouter }             from 'next/navigation'
import { useTranslations }       from 'next-intl'
import { supabase }              from '@/lib/supabase'
import { InvoicePreview }        from '@/components/invoices/InvoicePreview'
import type { InvoiceLineItem, BillingSettings } from '@/components/invoices/InvoicePreview'

// ── Local types ───────────────────────────────────────────────────────────────

interface Client     { id: string; name: string }
interface Project    { id: string; name: string; client_id: string; tjm_vendu?: number }
interface Consultant { id: string; name: string; tjm_cout_reel?: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2)

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function emptyLine(): InvoiceLineItem {
  return { id: uid(), description: '', detail: '', quantity: 1, unit: 'day', unit_price: 0 }
}

// ── UI atoms ──────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 2,
      textTransform: 'uppercase', marginBottom: 6 }}>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', style = {} }: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  style?: React.CSSProperties
}) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 3, color: 'var(--text)', padding: '8px 12px',
        fontFamily: 'var(--font-mono, monospace)', fontSize: 12, outline: 'none',
        ...style,
      }}
    />
  )
}

function Select({ value, onChange, children, style = {} }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 3, color: 'var(--text)', padding: '8px 12px',
        fontFamily: 'var(--font-mono, monospace)', fontSize: 12, outline: 'none',
        ...style,
      }}
    >
      {children}
    </select>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, color: 'var(--text2)', letterSpacing: 3,
      textTransform: 'uppercase', borderBottom: '1px solid var(--border)',
      paddingBottom: 8, marginBottom: 16, marginTop: 28,
    }}>
      {'// ' + children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InvoiceForm() {
  const router = useRouter()
  const t      = useTranslations('invoices.form')
  const MONTHS = t.raw('months') as string[]

  // Form state
  const [sourceType,    setSourceType]    = useState<'timesheet' | 'project' | 'manual'>('timesheet')
  const [clientId,      setClientId]      = useState('')
  const [clientName,    setClientName]    = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [projectId,     setProjectId]     = useState('')
  const [projectName,   setProjectName]   = useState('')
  const [consultantId,  setConsultantId]  = useState('')
  const [invoiceDate,   setInvoiceDate]   = useState(new Date().toISOString().slice(0, 10))
  const [paymentTerms,  setPaymentTerms]  = useState(30)
  const [tvaRate,       setTvaRate]       = useState(20)
  const [notes,         setNotes]         = useState('')
  const [lines,         setLines]         = useState<InvoiceLineItem[]>([emptyLine()])

  // Timesheet import
  const [importMonth, setImportMonth] = useState(new Date().getMonth())
  const [importYear,  setImportYear]  = useState(new Date().getFullYear())
  const [importing,   setImporting]   = useState(false)

  // Reference data
  const [clients,     setClients]     = useState<Client[]>([])
  const [projects,    setProjects]    = useState<Project[]>([])
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [billing,     setBilling]     = useState<BillingSettings>({})
  const [saving,      setSaving]      = useState(false)

  const dueDate = invoiceDate
    ? new Date(new Date(invoiceDate).getTime() + paymentTerms * 86400000).toISOString().slice(0, 10)
    : ''

  const subtotal  = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)
  const tvaAmount = subtotal * tvaRate / 100
  const total     = subtotal + tvaAmount

  const periodLabel = sourceType === 'timesheet'
    ? MONTHS[importMonth] + ' ' + importYear
    : ''

  // Load reference data
  useEffect(() => {
    Promise.all([
      supabase.from('clients').select('id,name').order('name'),
      supabase.from('projects').select('id,name,client_id,tjm_vendu').eq('status', 'active'),
      supabase.from('consultants').select('id,name,tjm_cout_reel').order('name'),
      supabase.from('companies').select('billing_settings').single(),
    ]).then(([cl, pr, co, comp]) => {
      if (cl.data)   setClients(cl.data)
      if (pr.data)   setProjects(pr.data)
      if (co.data)   setConsultants(co.data)
      if (comp.data?.billing_settings) setBilling(comp.data.billing_settings)
    })
  }, [])

  // ── Import depuis timesheet ──────────────────────────────────────────────

  const importFromTimesheet = async () => {
    setImporting(true)
    try {
      const month = String(importMonth + 1).padStart(2, '0')
      const from  = importYear + '-' + month + '-01'
      const lastDay = new Date(importYear, importMonth + 1, 0).getDate()
      const to    = importYear + '-' + month + '-' + lastDay

      let q = supabase
        .from('timesheets')
        .select('date,value,consultant_id,project_id,projects(name),consultants(name,tjm_cout_reel)')
        .gte('date', from).lte('date', to)
        .eq('status', 'approved')

      if (consultantId) q = (q as any).eq('consultant_id', consultantId)
      if (projectId)    q = (q as any).eq('project_id', projectId)

      const { data } = await q

      if (!data?.length) {
        alert(t('timesheetImport.noData'))
        return
      }

      // Group by consultant + project
      const groups = new Map<string, { desc: string; days: number; rate: number }>()
      data.forEach((entry: any) => {
        const cName  = entry.consultants?.name ?? 'Consultant'
        const pName  = entry.projects?.name    ?? projectName ?? 'Project'
        const rate   = entry.consultants?.tjm_cout_reel ?? 0
        const key    = cName + '__' + pName
        if (!groups.has(key)) groups.set(key, { desc: cName + ' — ' + pName, days: 0, rate })
        groups.get(key)!.days += entry.value
      })

      setLines(Array.from(groups.values()).map(g => ({
        id:          uid(),
        description: g.desc,
        detail:      MONTHS[importMonth] + ' ' + importYear + ' · ' + g.days + (g.days !== 1
          ? ' ' + t('lines.units.day') + 's'
          : ' ' + t('lines.units.day')),
        quantity:    g.days,
        unit:        'day' as const,
        unit_price:  g.rate,
      })))
    } finally {
      setImporting(false)
    }
  }

  // ── Import depuis projet ─────────────────────────────────────────────────

  const importFromProject = () => {
    const proj = projects.find(p => p.id === projectId)
    if (!proj) return
    setLines([{
      id:          uid(),
      description: proj.name,
      detail:      '',
      quantity:    1,
      unit:        'day',
      unit_price:  proj.tjm_vendu ?? 0,
    }])
  }

  // ── Lines ────────────────────────────────────────────────────────────────

  const updateLine = (id: string, field: keyof InvoiceLineItem, val: string | number) =>
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l))

  const addLine    = () => setLines(prev => [...prev, emptyLine()])
  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id))

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async (asDraft: boolean) => {
    setSaving(true)
    try {
      const { data: company } = await supabase.from('companies').select('id').single()
      if (!company) return

      const { data: invoiceNumber } = await supabase
        .rpc('next_invoice_number', { p_company_id: company.id })

      const month   = String(importMonth + 1).padStart(2, '0')
      const lastDay = new Date(importYear, importMonth + 1, 0).getDate()

      const { data: inv, error } = await supabase.from('invoices').insert({
        company_id:          company.id,
        client_id:           clientId     || null,
        project_id:          projectId    || null,
        consultant_id:       consultantId || null,
        invoice_number:      invoiceNumber ?? ('INV-' + Date.now()),
        invoice_date:        invoiceDate,
        due_date:            dueDate || null,
        status:              asDraft ? 'draft' : 'sent',
        subtotal,
        tva_rate:            tvaRate,
        tva_amount:          tvaAmount,
        total_ttc:           total,
        source_type:         sourceType,
        source_period_start: sourceType === 'timesheet' ? importYear + '-' + month + '-01'        : null,
        source_period_end:   sourceType === 'timesheet' ? importYear + '-' + month + '-' + lastDay : null,
        notes:               notes || null,
        payment_terms:       paymentTerms,
        emitter_snapshot:    billing,
        client_snapshot:     clientName ? { name: clientName, address: clientAddress } : null,
      }).select().single()

      if (error || !inv) throw error

      await supabase.from('invoice_lines').insert(
        lines.filter(l => l.description).map((l, i) => ({
          invoice_id:  inv.id,
          company_id:  company.id,
          description: l.description,
          detail:      l.detail  || null,
          quantity:    l.quantity,
          unit:        l.unit,
          unit_price:  l.unit_price,
          sort_order:  i,
        }))
      )

      router.push('/invoices')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

        {/* ── LEFT — Form ───────────────────────────────────────────────── */}
        <div style={{ width: '50%', overflowY: 'auto', padding: '24px 32px',
          borderRight: '1px solid var(--border)' }}>

          {/* Source */}
          <SectionTitle>{t('sections.source')}</SectionTitle>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['timesheet', 'project', 'manual'] as const).map(s => (
              <button key={s} onClick={() => setSourceType(s)} style={{
                flex: 1, padding: '8px', borderRadius: 3, cursor: 'pointer',
                fontFamily: 'var(--font-mono, monospace)', fontSize: 10,
                letterSpacing: 1, textTransform: 'uppercase',
                border:     sourceType === s ? '1px solid var(--cyan)' : '1px solid var(--border)',
                background: sourceType === s ? 'rgba(0,229,255,.08)'   : 'none',
                color:      sourceType === s ? 'var(--cyan)'            : 'var(--text2)',
              }}>
                {t(`source.${s}`)}
              </button>
            ))}
          </div>

          {/* Timesheet import */}
          {sourceType === 'timesheet' && (
            <div style={{ padding: '16px', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: 4, marginBottom: 20 }}>
              <FieldLabel>{t('timesheetImport.label')}</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
                <Select value={String(importMonth)} onChange={v => setImportMonth(Number(v))}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </Select>
                <Input value={importYear} onChange={v => setImportYear(Number(v))} type="number" />
                <Select value={consultantId} onChange={v => setConsultantId(v)}>
                  <option value="">{t('timesheetImport.allConsultants')}</option>
                  {consultants.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <button onClick={importFromTimesheet} disabled={importing} style={{
                  background: 'var(--cyan)', color: '#060a06', border: 'none',
                  padding: '8px 16px', borderRadius: 3, cursor: 'pointer',
                  fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono, monospace)',
                  opacity: importing ? 0.6 : 1, whiteSpace: 'nowrap',
                }}>
                  {importing ? t('timesheetImport.loading') : t('timesheetImport.import')}
                </button>
              </div>
            </div>
          )}

          {/* Project import */}
          {sourceType === 'project' && (
            <div style={{ padding: '16px', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: 4, marginBottom: 20 }}>
              <FieldLabel>{t('projectImport.label')}</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <Select value={projectId} onChange={v => {
                  setProjectId(v)
                  const p = projects.find(x => x.id === v)
                  if (p) setProjectName(p.name)
                }}>
                  <option value="">{t('projectImport.placeholder')}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                <button onClick={importFromProject} style={{
                  background: 'var(--cyan)', color: '#060a06', border: 'none',
                  padding: '8px 16px', borderRadius: 3, cursor: 'pointer',
                  fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono, monospace)',
                }}>
                  {t('projectImport.load')}
                </button>
              </div>
            </div>
          )}

          {/* Client */}
          <SectionTitle>{t('sections.client')}</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <FieldLabel>{t('fields.client')}</FieldLabel>
              <Select value={clientId} onChange={v => {
                setClientId(v)
                setClientName(clients.find(c => c.id === v)?.name ?? '')
              }}>
                <option value="">{t('fields.clientSelect')}</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <FieldLabel>{t('fields.clientOverride')}</FieldLabel>
              <Input value={clientName} onChange={setClientName} placeholder="Acme Corp" />
            </div>
          </div>
          <FieldLabel>{t('fields.clientAddress')}</FieldLabel>
          <textarea
            value={clientAddress} onChange={e => setClientAddress(e.target.value)}
            placeholder={'12 rue de la Paix\n75001 Paris\nFrance'}
            rows={3}
            style={{
              width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 3, color: 'var(--text)', padding: '8px 12px',
              fontFamily: 'var(--font-mono, monospace)', fontSize: 11,
              outline: 'none', resize: 'vertical', marginBottom: 12,
            }}
          />

          {/* Dates */}
          <SectionTitle>{t('sections.dates')}</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <FieldLabel>{t('fields.invoiceDate')}</FieldLabel>
              <Input type="date" value={invoiceDate} onChange={setInvoiceDate} />
            </div>
            <div>
              <FieldLabel>{t('fields.paymentTerms')}</FieldLabel>
              <Input type="number" value={paymentTerms}
                onChange={v => setPaymentTerms(Number(v))} />
            </div>
            <div>
              <FieldLabel>{t('fields.dueDate')}</FieldLabel>
              <Input value={dueDate} onChange={() => {}} style={{ opacity: 0.5 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 12, marginBottom: 20 }}>
            <div>
              <FieldLabel>{t('fields.vat')}</FieldLabel>
              <Input type="number" value={tvaRate} onChange={v => setTvaRate(Number(v))} />
            </div>
            <div>
              <FieldLabel>{t('fields.projectDesc')}</FieldLabel>
              <Input value={projectName} onChange={setProjectName}
                placeholder={t('fields.projectDescHint')} />
            </div>
          </div>

          {/* Lines */}
          <SectionTitle>{t('sections.lines')}</SectionTitle>
          {lines.map(line => (
            <div key={line.id} style={{
              padding: '12px', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: 4, marginBottom: 8,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 100px 28px', gap: 8, marginBottom: 8 }}>
                <Input value={line.description}
                  onChange={v => updateLine(line.id, 'description', v)}
                  placeholder={t('lines.description')} />
                <Input type="number" value={line.quantity}
                  onChange={v => updateLine(line.id, 'quantity', parseFloat(v) || 0)} />
                <Select value={line.unit}
                  onChange={v => updateLine(line.id, 'unit', v)}>
                  <option value="day">{t('lines.units.day')}</option>
                  <option value="hour">{t('lines.units.hour')}</option>
                  <option value="unit">{t('lines.units.unit')}</option>
                </Select>
                <Input type="number" value={line.unit_price}
                  onChange={v => updateLine(line.id, 'unit_price', parseFloat(v) || 0)}
                  placeholder={t('lines.rate')} />
                <button onClick={() => removeLine(line.id)} style={{
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--pink)', cursor: 'pointer', borderRadius: 3, fontSize: 12,
                }}>✕</button>
              </div>
              <Input value={line.detail}
                onChange={v => updateLine(line.id, 'detail', v)}
                placeholder={t('lines.detail')}
                style={{ fontSize: 10, opacity: 0.7 }} />
              <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--cyan)',
                marginTop: 6, fontFamily: 'var(--font-mono, monospace)' }}>
                = {fmt(line.quantity * line.unit_price)} €
              </div>
            </div>
          ))}
          <button onClick={addLine} style={{
            width: '100%', padding: '8px', background: 'none',
            border: '1px dashed var(--border)', borderRadius: 3,
            color: 'var(--text2)', cursor: 'pointer', fontSize: 11,
            fontFamily: 'var(--font-mono, monospace)', marginBottom: 20,
          }}>
            {t('lines.addLine')}
          </button>

          {/* Notes */}
          <SectionTitle>{t('sections.notes')}</SectionTitle>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={t('fields.notesHint')}
            rows={3}
            style={{
              width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 3, color: 'var(--text)', padding: '8px 12px',
              fontFamily: 'var(--font-mono, monospace)', fontSize: 11,
              outline: 'none', resize: 'vertical', marginBottom: 24,
            }}
          />

          {/* Totals */}
          <div style={{ padding: '16px 20px', background: 'var(--bg2)',
            border: '1px solid var(--border)', borderRadius: 4, marginBottom: 24 }}>
            {[
              { label: t('totals.subtotal'),                  value: fmt(subtotal)  + ' €', color: 'var(--text2)' },
              { label: t('totals.vat', { rate: tvaRate }),    value: fmt(tvaAmount) + ' €', color: 'var(--text2)' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between',
                fontSize: 11, color: row.color, marginBottom: 6 }}>
                <span>{row.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between',
              fontSize: 16, fontWeight: 700, color: 'var(--green)',
              borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <span>{t('totals.total')}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(total)} €</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleSave(true)} disabled={saving} style={{
              flex: 1, padding: '12px', background: 'none',
              border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer',
              color: 'var(--text2)', fontSize: 11, fontWeight: 700,
              fontFamily: 'var(--font-mono, monospace)', letterSpacing: 1,
              opacity: saving ? 0.5 : 1,
            }}>
              {t('actions.saveDraft')}
            </button>
            <button onClick={() => handleSave(false)} disabled={saving} style={{
              flex: 2, padding: '12px', background: 'var(--green)',
              border: 'none', borderRadius: 3, cursor: 'pointer',
              color: '#060a06', fontSize: 11, fontWeight: 700,
              fontFamily: 'var(--font-mono, monospace)', letterSpacing: 1,
              opacity: saving ? 0.5 : 1,
            }}>
              {saving ? t('actions.saving') : t('actions.send')}
            </button>
          </div>
        </div>

        {/* ── RIGHT — Live preview ───────────────────────────────────────── */}
        <div style={{ width: '50%', overflowY: 'auto', padding: '24px 32px', background: '#1a1a1a' }}>
          <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 3,
            textTransform: 'uppercase', marginBottom: 16 }}>
            {t('livePreview')}
          </div>
          <InvoicePreview
            invoiceNumber={(billing.invoice_prefix ?? 'INV-2026-') + '0001'}
            invoiceDate={invoiceDate}
            dueDate={dueDate}
            lines={lines}
            tvaRate={tvaRate}
            clientName={clientName}
            clientAddress={clientAddress}
            projectName={projectName}
            billing={billing}
            notes={notes}
            periodLabel={periodLabel}
          />
        </div>
      </div>
    </>
  )
}