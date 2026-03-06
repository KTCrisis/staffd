'use client'

// ══════════════════════════════════════════════════════════════
// components/settings/BillingTab.tsx
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useActiveTenant }    from '@/lib/tenant-context'
import { useCompanySettings, updateCompanySettings } from '@/lib/data'
import {
  SectionLabel, SettingsField, SettingsInput, SettingsTextarea,
  SaveBar, Skeleton, ErrorBanner,
} from './shared'

export function BillingTab() {
  const { activeTenantId } = useActiveTenant()
  const [refresh, setRefresh] = useState(0)
  const { data: companyData, loading } = useCompanySettings(refresh)

  const [iban,          setIban]          = useState('')
  const [bic,           setBic]           = useState('')
  const [bankName,      setBankName]      = useState('')
  const [invoicePrefix, setInvoicePrefix] = useState('')
  const [paymentTerms,  setPaymentTerms]  = useState('')
  const [legalMention,  setLegalMention]  = useState('')
  const [tvaRate,       setTvaRate]       = useState('')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    if (!companyData) return
    const b = companyData.billing_settings ?? {}
    setIban(b.bank_iban ?? '')
    setBic(b.bank_bic ?? '')
    setBankName(b.bank_name ?? '')
    setInvoicePrefix(b.invoice_prefix ?? '')
    setPaymentTerms(String(b.payment_terms ?? 30))
    setLegalMention(b.legal_mention ?? '')
    setTvaRate(String(b.tva_rate ?? 20))
  }, [companyData])

  const b = companyData?.billing_settings ?? {}
  const dirty = (
    iban          !== (b.bank_iban      ?? '') ||
    bic           !== (b.bank_bic       ?? '') ||
    bankName      !== (b.bank_name      ?? '') ||
    invoicePrefix !== (b.invoice_prefix ?? '') ||
    paymentTerms  !== String(b.payment_terms ?? 30) ||
    legalMention  !== (b.legal_mention  ?? '') ||
    tvaRate       !== String(b.tva_rate ?? 20)
  )

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      await updateCompanySettings({
        billing_settings: {
          bank_iban: iban, bank_bic: bic, bank_name: bankName,
          invoice_prefix: invoicePrefix, payment_terms: Number(paymentTerms),
          legal_mention: legalMention, tva_rate: Number(tvaRate),
        },
        companyId: activeTenantId ?? undefined,
      })
      setRefresh(r => r + 1)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!companyData) return
    const bs = companyData.billing_settings ?? {}
    setIban(bs.bank_iban ?? '')
    setBic(bs.bank_bic ?? '')
    setBankName(bs.bank_name ?? '')
    setInvoicePrefix(bs.invoice_prefix ?? '')
    setPaymentTerms(String(bs.payment_terms ?? 30))
    setLegalMention(bs.legal_mention ?? '')
    setTvaRate(String(bs.tva_rate ?? 20))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <ErrorBanner message={error} />

      {/* Coordonnées bancaires */}
      <section>
        <SectionLabel label="BANK_DETAILS" />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {loading ? <Skeleton h={120} /> : (
            <>
              <SettingsField label="IBAN">
                <SettingsInput
                  value={iban} onChange={setIban}
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                />
              </SettingsField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SettingsField label="BIC / SWIFT">
                  <SettingsInput value={bic} onChange={setBic} placeholder="BNPAFRPPXXX" />
                </SettingsField>
                <SettingsField label="Bank name">
                  <SettingsInput value={bankName} onChange={setBankName} placeholder="BNP Paribas" />
                </SettingsField>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Paramètres factures */}
      <section>
        <SectionLabel label="INVOICE_SETTINGS" />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {loading ? <Skeleton h={120} /> : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <SettingsField label="Invoice prefix" hint="e.g. NEX-2026-">
                <SettingsInput
                  value={invoicePrefix} onChange={setInvoicePrefix}
                  placeholder="NEX-2026-"
                />
              </SettingsField>
              <SettingsField label="Invoice counter" hint="Read-only — auto-incremented">
                <SettingsInput
                  value={String(companyData?.billing_settings?.invoice_counter ?? 0)}
                  onChange={() => {}}
                  disabled
                />
              </SettingsField>
              <SettingsField label="Payment terms (days)">
                <SettingsInput
                  value={paymentTerms} onChange={setPaymentTerms}
                  type="number" placeholder="30"
                />
              </SettingsField>
            </div>
          )}
        </div>
      </section>

      {/* TVA + mentions légales */}
      <section>
        <SectionLabel label="TAX_AND_LEGAL" />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {loading ? <Skeleton h={120} /> : (
            <>
              <SettingsField label="TVA rate (%)" hint="Set to 0 for auto-entrepreneur (non assujetti)">
                <SettingsInput
                  value={tvaRate} onChange={setTvaRate}
                  type="number" placeholder="20"
                />
              </SettingsField>
              <SettingsField label="Legal mention" hint="Appears at the bottom of every invoice">
                <SettingsTextarea
                  value={legalMention} onChange={setLegalMention}
                  placeholder="Auto-entrepreneur — dispensé d'immatriculation au RCS..."
                  rows={3}
                />
              </SettingsField>
            </>
          )}
        </div>
      </section>

      <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onReset={handleReset} />
    </div>
  )
}