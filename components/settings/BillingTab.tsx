'use client'

// ══════════════════════════════════════════════════════════════
// components/settings/BillingTab.tsx
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useTranslations }    from 'next-intl'
import { useActiveTenant }    from '@/lib/tenant-context'
import { useCompanySettings, updateCompanySettings } from '@/lib/data'
import {
  SectionLabel, SettingsField, SettingsInput, SettingsTextarea,
  SaveBar, Skeleton, ErrorBanner,
} from './shared'

export function BillingTab() {
  const t = useTranslations('settings.billing')
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
  // Identité de l'émetteur : un seul objet, champs texte libres
  const IDENTITY_KEYS = ['legal_name', 'legal_form', 'share_capital', 'address', 'siret', 'rcs_city', 'tva_number'] as const
  type IdentityKey = typeof IDENTITY_KEYS[number]
  const [identity, setIdentity] = useState<Record<IdentityKey, string>>(
    Object.fromEntries(IDENTITY_KEYS.map(k => [k, ''])) as Record<IdentityKey, string>,
  )
  const identityFrom = (bs: Record<string, unknown>) =>
    Object.fromEntries(IDENTITY_KEYS.map(k => [k, String(bs[k] ?? '')])) as Record<IdentityKey, string>
  const setId = (k: IdentityKey) => (v: string) => setIdentity(s => ({ ...s, [k]: v }))

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
    setIdentity(identityFrom(b as Record<string, unknown>))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyData])

  const b = companyData?.billing_settings ?? {}
  const dirty = (
    iban          !== (b.bank_iban      ?? '') ||
    bic           !== (b.bank_bic       ?? '') ||
    bankName      !== (b.bank_name      ?? '') ||
    invoicePrefix !== (b.invoice_prefix ?? '') ||
    paymentTerms  !== String(b.payment_terms ?? 30) ||
    legalMention  !== (b.legal_mention  ?? '') ||
    tvaRate       !== String(b.tva_rate ?? 20) ||
    JSON.stringify(identity) !== JSON.stringify(identityFrom(b as Record<string, unknown>))
  )

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      await updateCompanySettings({
        billing_settings: {
          bank_iban: iban, bank_bic: bic, bank_name: bankName,
          invoice_prefix: invoicePrefix, payment_terms: Number(paymentTerms),
          legal_mention: legalMention, tva_rate: Number(tvaRate),
          ...identity,
        },
        companyId: activeTenantId ?? undefined,
      })
      setRefresh(r => r + 1)
    } catch (e) {
      setError((e as Error).message)
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
    setIdentity(identityFrom(bs as Record<string, unknown>))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <ErrorBanner message={error} />

      {/* ── Identité de l'émetteur (mentions obligatoires) ── */}
      <section>
        <SectionLabel label={t('identitySection')} />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {loading ? <Skeleton h={160} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                <SettingsField label={t('legalNameLabel')}>
                  <SettingsInput value={identity.legal_name} onChange={setId('legal_name')} placeholder="ACME Conseil" />
                </SettingsField>
                <SettingsField label={t('legalFormLabel')}>
                  <SettingsInput value={identity.legal_form} onChange={setId('legal_form')} placeholder="SAS" />
                </SettingsField>
                <SettingsField label={t('shareCapitalLabel')}>
                  <SettingsInput value={identity.share_capital} onChange={setId('share_capital')} placeholder="10 000" />
                </SettingsField>
              </div>
              <SettingsField label={t('addressLabel')}>
                <SettingsTextarea value={identity.address} onChange={setId('address')} placeholder={'12 rue de la Paix\n75002 Paris'} rows={2} />
              </SettingsField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <SettingsField label={t('siretLabel')}>
                  <SettingsInput value={identity.siret} onChange={setId('siret')} placeholder="123 456 789 00012" />
                </SettingsField>
                <SettingsField label={t('rcsLabel')}>
                  <SettingsInput value={identity.rcs_city} onChange={setId('rcs_city')} placeholder="Paris" />
                </SettingsField>
                <SettingsField label={t('tvaNumberLabel')}>
                  <SettingsInput value={identity.tva_number} onChange={setId('tva_number')} placeholder="FR12 123456789" />
                </SettingsField>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Coordonnées bancaires ── */}
      <section>
        <SectionLabel label={t('bankSection')} />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {loading ? <Skeleton h={120} /> : (
            <>
              <SettingsField label={t('ibanLabel')}>
                <SettingsInput
                  value={iban} onChange={setIban}
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                />
              </SettingsField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SettingsField label={t('bicLabel')}>
                  <SettingsInput value={bic} onChange={setBic} placeholder="BNPAFRPPXXX" />
                </SettingsField>
                <SettingsField label={t('bankNameLabel')}>
                  <SettingsInput value={bankName} onChange={setBankName} placeholder="BNP Paribas" />
                </SettingsField>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Paramètres factures ── */}
      <section>
        <SectionLabel label={t('invoiceSection')} />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {loading ? <Skeleton h={120} /> : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <SettingsField label={t('prefixLabel')} hint={t('prefixHint')}>
                <SettingsInput
                  value={invoicePrefix} onChange={setInvoicePrefix}
                  placeholder="ACME-{YYYY}-"
                />
              </SettingsField>
              <SettingsField label={t('counterLabel')} hint={t('counterHint')}>
                <SettingsInput
                  value={String(companyData?.billing_settings?.invoice_counter ?? 0)}
                  onChange={() => {}}
                  disabled
                />
              </SettingsField>
              <SettingsField label={t('paymentTermsLabel')}>
                <SettingsInput
                  value={paymentTerms} onChange={setPaymentTerms}
                  type="number" placeholder="30"
                />
              </SettingsField>
            </div>
          )}
        </div>
      </section>

      {/* ── TVA + mentions légales ── */}
      <section>
        <SectionLabel label={t('taxSection')} />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {loading ? <Skeleton h={120} /> : (
            <>
              <SettingsField label={t('tvaLabel')} hint={t('tvaHint')}>
                <SettingsInput
                  value={tvaRate} onChange={setTvaRate}
                  type="number" placeholder="20"
                />
              </SettingsField>
              <SettingsField label={t('legalLabel')} hint={t('legalHint')}>
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