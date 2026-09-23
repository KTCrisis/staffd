'use client'

// ══════════════════════════════════════════════════════════════
// components/invoices/InvoicePreview.tsx
// La facture telle qu'elle s'imprime : utilisée par le formulaire (aperçu
// du brouillon) et par la page de détail (facture émise, instantanés figés).
// Mentions B2B obligatoires en pied (pénalités, indemnité de 40 €,
// escompte) ; identité de l'émetteur tirée des réglages de facturation.
// La classe .invoice-sheet est la seule zone imprimée (styles/globals.css).
// ══════════════════════════════════════════════════════════════

import { useTranslations } from 'next-intl'
import { toISO }           from '@/lib/utils'
import { headingFontHref } from '@/lib/branding'
import type { InvoiceStyle } from '@/lib/branding'

// ── Shared types (exported for InvoiceForm and the detail page) ─────────────

export interface InvoiceLineItem {
  id:          string
  description: string
  detail:      string
  quantity:    number
  unit:        'day' | 'hour' | 'unit' | 'fixed'
  unit_price:  number
}

export interface BillingSettings {
  legal_name?:     string
  legal_form?:     string
  share_capital?:  string
  address?:        string
  siret?:          string
  rcs_city?:       string
  tva_number?:     string
  tva_rate?:       number
  payment_terms?:  number
  bank_iban?:      string
  bank_bic?:       string
  bank_name?:      string
  legal_mention?:  string
  invoice_prefix?: string
  company_name?:   string   // ajouté à l'instantané par issue_invoice()
}

export interface InvoiceClient {
  name:        string
  address?:    string | null
  siren?:      string | null
  tva_number?: string | null
}

export interface InvoicePreviewProps {
  invoiceNumber: string | null      // null = brouillon, numéro attribué à l'émission
  invoiceDate:   string
  dueDate:       string
  lines:         InvoiceLineItem[]
  tvaRate:       number
  client:        InvoiceClient
  projectName:   string
  billing:       BillingSettings
  notes:         string
  periodLabel:   string
  /** Charte du tenant (accent du thème clair, police des titres) — lib/branding */
  style?:        InvoiceStyle
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InvoicePreview({
  invoiceNumber, invoiceDate, dueDate, lines, tvaRate,
  client, projectName, billing, notes, periodLabel, style,
}: InvoicePreviewProps) {
  const t = useTranslations('invoices.preview')
  const accent   = style?.accent ?? '#000'
  const fontHref = headingFontHref(style?.headingFont ?? null)
  const heading  = style?.headingFont ? `'${style.headingFont}', Georgia, serif` : 'Georgia, serif'

  const subtotal  = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)
  const tvaAmount = subtotal * tvaRate / 100
  const total     = subtotal + tvaAmount
  const date      = invoiceDate || toISO(new Date())
  const shown     = lines.filter(l => l.description)

  const emitterName = billing.legal_name || billing.company_name || t('emitterName')
  const legalLine   = [
    billing.legal_form && billing.share_capital
      ? t('formCapital', { form: billing.legal_form, capital: billing.share_capital })
      : billing.legal_form,
    billing.siret    && `SIRET ${billing.siret}`,
    billing.rcs_city && `RCS ${billing.rcs_city}`,
  ].filter(Boolean).join(' · ')

  const small = { fontSize: 10, color: '#666' }
  const label = { fontSize: 9, letterSpacing: 2, color: '#999', textTransform: 'uppercase' as const, marginBottom: 8 }

  const tableHeaders = [
    { key: 'description', align: 'left'  },
    { key: 'qty',         align: 'right' },
    { key: 'unit',        align: 'right' },
    { key: 'unitPrice',   align: 'right' },
    { key: 'total',       align: 'right' },
  ] as const

  return (
    <div className="invoice-sheet" style={{
      background: '#fff', color: '#111', borderRadius: 4,
      padding: '40px 48px', fontFamily: 'Georgia, serif',
      fontSize: 12, lineHeight: 1.6,
      boxShadow: '0 4px 32px rgba(0,0,0,.4)',
    }}>
      {fontHref && <link rel="stylesheet" href={fontHref} />}

      {/* En-tête : filet et titre à la couleur du tenant */}
      <div style={{ height: 4, background: accent, margin: '-40px -48px 32px', borderRadius: '4px 4px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: accent, letterSpacing: -1, fontFamily: heading }}>{t('title')}</div>
          <div style={{ fontSize: 12, color: invoiceNumber ? '#333' : '#c00', marginTop: 4, fontWeight: 600 }}>
            {invoiceNumber ?? t('draft')}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#555' }}>
          <div><strong>{t('date')}</strong> {date}</div>
          {dueDate && <div><strong>{t('due')}</strong> {dueDate}</div>}
        </div>
      </div>

      {/* Émetteur / Client */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
        <div>
          <div style={label}>{t('from')}</div>
          <div style={{ fontWeight: 700, fontSize: 13, fontFamily: heading }}>{emitterName}</div>
          <div style={{ ...small, marginTop: 4 }}>
            {billing.address && <div style={{ whiteSpace: 'pre-line' }}>{billing.address}</div>}
            {legalLine && <div>{legalLine}</div>}
            {billing.tva_number && <div>{t('vatNumber')} {billing.tva_number}</div>}
          </div>
        </div>
        <div>
          <div style={label}>{t('billTo')}</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{client.name || t('clientName')}</div>
          <div style={{ ...small, marginTop: 4 }}>
            {client.address && <div style={{ whiteSpace: 'pre-line' }}>{client.address}</div>}
            {client.siren && <div>SIREN {client.siren}</div>}
            {client.tva_number && <div>{t('vatNumber')} {client.tva_number}</div>}
          </div>
          {projectName && (
            <div style={{ fontSize: 10, color: '#444', marginTop: 6 }}>
              {t('re')} {projectName}{periodLabel ? ' · ' + periodLabel : ''}
            </div>
          )}
        </div>
      </div>

      {/* Lignes */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${accent}` }}>
            {tableHeaders.map(h => (
              <th key={h.key} style={{
                textAlign: h.align, padding: '6px 8px', fontSize: 10, letterSpacing: 1,
                textTransform: 'uppercase', color: '#555', fontWeight: 600,
              }}>
                {t(`table.${h.key}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map(l => (
            <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px 8px' }}>
                <div style={{ fontWeight: 600 }}>{l.description}</div>
                {l.detail && <div style={{ fontSize: 10, color: '#888' }}>{l.detail}</div>}
              </td>
              <td style={{ textAlign: 'right', padding: '10px 8px' }}>{l.quantity}</td>
              <td style={{ textAlign: 'right', padding: '10px 8px', color: '#888', fontSize: 10 }}>
                {t(`units.${l.unit ?? 'unit'}`)}
              </td>
              <td style={{ textAlign: 'right', padding: '10px 8px' }}>{fmt(l.unit_price)} €</td>
              <td style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600 }}>{fmt(l.quantity * l.unit_price)} €</td>
            </tr>
          ))}
          {shown.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#ccc', fontSize: 11 }}>
                {t('emptyLines')}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totaux */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
        <div style={{ minWidth: 240 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 11, color: '#555', borderBottom: '1px solid #eee' }}>
            <span>{t('subtotal')}</span><span>{fmt(subtotal)} €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 11, color: '#555', borderBottom: '1px solid #eee' }}>
            <span>{t('vat', { rate: tvaRate })}</span><span>{fmt(tvaAmount)} €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, fontWeight: 700, color: '#000', borderBottom: `2px solid ${accent}` }}>
            <span>{t('grandTotal')}</span><span>{fmt(total)} €</span>
          </div>
        </div>
      </div>

      {/* Règlement */}
      {billing.bank_iban && (
        <div style={{ padding: '12px 16px', background: '#f6f6f6', borderRadius: 3, fontSize: 10, color: '#555', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('paymentDetails')}</div>
          <div>IBAN {billing.bank_iban}</div>
          {billing.bank_bic  && <div>BIC {billing.bank_bic}</div>}
          {billing.bank_name && <div>{billing.bank_name}</div>}
        </div>
      )}

      {notes && <div style={{ fontSize: 10, color: '#777', fontStyle: 'italic', marginBottom: 16 }}>{notes}</div>}

      {/* Mentions obligatoires (B2B, France) */}
      <div style={{ fontSize: 8.5, color: '#999', borderTop: '1px solid #eee', paddingTop: 10, lineHeight: 1.5 }}>
        <div>{t('legal.penalties')}</div>
        <div>{t('legal.indemnity')}</div>
        <div>{t('legal.discount')}</div>
        {billing.legal_mention && <div style={{ marginTop: 4 }}>{billing.legal_mention}</div>}
      </div>
    </div>
  )
}
