'use client'

// ══════════════════════════════════════════════════════════════
// components/settings/CompanyTab.tsx
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useActiveTenant }    from '@/lib/tenant-context'
import { useCompanySettings, updateCompanySettings } from '@/lib/data'
import {
  SectionLabel, SettingsField, SettingsInput,
  SaveBar, Skeleton, ErrorBanner,
} from './shared'

export function CompanyTab() {
  const { activeTenantId } = useActiveTenant()
  const [refresh, setRefresh] = useState(0)
  const { data: companyData, loading } = useCompanySettings(refresh)

  const [companyName,    setCompanyName]    = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companySiret,   setCompanySiret]   = useState('')
  const [companyTva,     setCompanyTva]     = useState('')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    if (!companyData) return
    const b = companyData.billing_settings ?? {}
    setCompanyName(companyData.name ?? '')
    setCompanyAddress(b.address ?? '')
    setCompanySiret(b.siret ?? '')
    setCompanyTva(b.tva_number ?? '')
  }, [companyData])

  const b = companyData?.billing_settings ?? {}
  const dirty = (
    companyName    !== (companyData?.name ?? '') ||
    companyAddress !== (b.address          ?? '') ||
    companySiret   !== (b.siret            ?? '') ||
    companyTva     !== (b.tva_number       ?? '')
  )

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      await updateCompanySettings({
        name: companyName,
        billing_settings: { address: companyAddress, siret: companySiret, tva_number: companyTva },
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
    setCompanyName(companyData.name ?? '')
    setCompanyAddress(bs.address ?? '')
    setCompanySiret(bs.siret ?? '')
    setCompanyTva(bs.tva_number ?? '')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <ErrorBanner message={error} />

      {/* Identité */}
      <section>
        <SectionLabel label="COMPANY_IDENTITY" />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {loading ? <Skeleton h={120} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SettingsField label="Company name *">
                  <SettingsInput
                    value={companyName}
                    onChange={setCompanyName}
                    placeholder="NexDigital"
                  />
                </SettingsField>
                <SettingsField label="Slug" hint="Used in URLs — cannot be changed">
                  <SettingsInput
                    value={companyData?.slug ?? ''}
                    onChange={() => {}}
                    disabled
                  />
                </SettingsField>
              </div>
              <SettingsField label="Address" hint="Appears on invoices">
                <SettingsInput
                  value={companyAddress}
                  onChange={setCompanyAddress}
                  placeholder="12 rue de la Paix, 75001 Paris"
                />
              </SettingsField>
            </>
          )}
        </div>
      </section>

      {/* Infos légales */}
      <section>
        <SectionLabel label="LEGAL_INFO" />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {loading ? <Skeleton h={80} /> : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SettingsField label="SIRET" hint="14 chiffres">
                <SettingsInput
                  value={companySiret}
                  onChange={setCompanySiret}
                  placeholder="12345678901234"
                />
              </SettingsField>
              <SettingsField label="N° TVA intracommunautaire">
                <SettingsInput
                  value={companyTva}
                  onChange={setCompanyTva}
                  placeholder="FR12345678901"
                />
              </SettingsField>
            </div>
          )}
        </div>
      </section>

      <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onReset={handleReset} />
    </div>
  )
}