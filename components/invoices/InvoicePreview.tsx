'use client'

// ── Shared types (exported for InvoiceForm) ──────────────────────────────────

export interface InvoiceLineItem {
  id:          string
  description: string
  detail:      string
  quantity:    number
  unit:        'day' | 'hour' | 'unit'
  unit_price:  number
}

export interface BillingSettings {
  siret?:          string
  tva_number?:     string
  tva_rate?:       number
  payment_terms?:  number
  bank_iban?:      string
  bank_bic?:       string
  bank_name?:      string
  legal_mention?:  string
  invoice_prefix?: string
}

export interface InvoicePreviewProps {
  invoiceNumber: string
  invoiceDate:   string
  dueDate:       string
  lines:         InvoiceLineItem[]
  tvaRate:       number
  clientName:    string
  clientAddress: string
  projectName:   string
  billing:       BillingSettings
  notes:         string
  periodLabel:   string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Component ────────────────────────────────────────────────────────────────

export function InvoicePreview({
  invoiceNumber, invoiceDate, dueDate, lines, tvaRate,
  clientName, clientAddress, projectName,
  billing, notes, periodLabel,
}: InvoicePreviewProps) {
  const subtotal  = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)
  const tvaAmount = subtotal * tvaRate / 100
  const total     = subtotal + tvaAmount
  const today     = invoiceDate || new Date().toISOString().slice(0, 10)

  return (
    <div style={{
      background: '#fff', color: '#111', borderRadius: 4,
      padding: '40px 48px', fontFamily: 'Georgia, serif',
      fontSize: 12, lineHeight: 1.6,
      boxShadow: '0 4px 32px rgba(0,0,0,.4)',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#000', letterSpacing: -1 }}>INVOICE</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{invoiceNumber || 'INV-2026-0001'}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#555' }}>
          <div><strong>Date:</strong> {today}</div>
          {dueDate && <div><strong>Due:</strong> {dueDate}</div>}
          {billing.payment_terms && (
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>Net {billing.payment_terms} days</div>
          )}
        </div>
      </div>

      {/* Emitter / Client */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 36 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: '#aaa', textTransform: 'uppercase', marginBottom: 8 }}>
            From
          </div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            {billing.siret ? 'Your Company Name' : '— emitter name —'}
          </div>
          {billing.siret && (
            <div style={{ fontSize: 10, color: '#777', marginTop: 4 }}>
              SIRET: {billing.siret}<br />
              {billing.tva_number && <span>VAT: {billing.tva_number}<br /></span>}
              {billing.legal_mention && (
                <span style={{ fontStyle: 'italic' }}>{billing.legal_mention}</span>
              )}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: '#aaa', textTransform: 'uppercase', marginBottom: 8 }}>
            Bill to
          </div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{clientName || '— client name —'}</div>
          {clientAddress && (
            <div style={{ fontSize: 10, color: '#777', marginTop: 4, whiteSpace: 'pre-line' }}>
              {clientAddress}
            </div>
          )}
          {projectName && (
            <div style={{ fontSize: 10, color: '#555', marginTop: 6 }}>
              Re: {projectName}{periodLabel ? ' · ' + periodLabel : ''}
            </div>
          )}
        </div>
      </div>

      {/* Lines */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000' }}>
            {['Description', 'Qty', 'Unit', 'Unit price', 'Total'].map(h => (
              <th key={h} style={{
                textAlign: h === 'Description' ? 'left' : 'right',
                padding: '6px 8px', fontSize: 10, letterSpacing: 1,
                textTransform: 'uppercase', color: '#555', fontWeight: 600,
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.filter(l => l.description).map(l => (
            <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px 8px' }}>
                <div style={{ fontWeight: 600 }}>{l.description}</div>
                {l.detail && <div style={{ fontSize: 10, color: '#888' }}>{l.detail}</div>}
              </td>
              <td style={{ textAlign: 'right', padding: '10px 8px' }}>{l.quantity}</td>
              <td style={{ textAlign: 'right', padding: '10px 8px', color: '#888', fontSize: 10 }}>{l.unit}</td>
              <td style={{ textAlign: 'right', padding: '10px 8px' }}>{fmt(l.unit_price)} €</td>
              <td style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600 }}>
                {fmt(l.quantity * l.unit_price)} €
              </td>
            </tr>
          ))}
          {lines.filter(l => l.description).length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#ccc', fontSize: 11 }}>
                Add lines on the left to see them here
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
        <div style={{ minWidth: 240 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            padding: '5px 0', fontSize: 11, color: '#555', borderBottom: '1px solid #eee' }}>
            <span>Subtotal (excl. VAT)</span>
            <span>{fmt(subtotal)} €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            padding: '5px 0', fontSize: 11, color: '#555', borderBottom: '1px solid #eee' }}>
            <span>VAT {tvaRate}%</span>
            <span>{fmt(tvaAmount)} €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            padding: '8px 0', fontSize: 14, fontWeight: 700, color: '#000', borderBottom: '2px solid #000' }}>
            <span>TOTAL (incl. VAT)</span>
            <span>{fmt(total)} €</span>
          </div>
        </div>
      </div>

      {/* Bank */}
      {billing.bank_iban && (
        <div style={{ padding: '12px 16px', background: '#f8f8f8',
          borderRadius: 3, fontSize: 10, color: '#555', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Payment details</div>
          <div>IBAN: {billing.bank_iban}</div>
          {billing.bank_bic  && <div>BIC: {billing.bank_bic}</div>}
          {billing.bank_name && <div>Bank: {billing.bank_name}</div>}
        </div>
      )}

      {notes && (
        <div style={{ fontSize: 10, color: '#888', fontStyle: 'italic', marginBottom: 16 }}>{notes}</div>
      )}

      {billing.legal_mention && (
        <div style={{ fontSize: 9, color: '#bbb', borderTop: '1px solid #eee', paddingTop: 12 }}>
          {billing.legal_mention}
        </div>
      )}
    </div>
  )
}