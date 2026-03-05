'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuthContext }               from '@/components/layout/AuthProvider'
import { createConsultant, updateConsultant } from '@/lib/data'
import type { Consultant }              from '@/types'
import type { ContractType }            from '@/lib/data'

const COLORS   = ['green', 'cyan', 'pink', 'gold', 'purple']
const STATUSES = ['available', 'assigned', 'partial', 'leave']

interface Props {
  consultant?: Consultant
  onClose:     () => void
  onSaved:     () => void
}

// ── Helper : tjm_cout_reel calculé côté client (mirror de la vue SQL) ────────
function calcTjmCoutReel(
  contractType:      ContractType,
  salaireAnnuelBrut: number | null,
  chargesPct:        number,
  joursTravailles:   number,
  tjmFacture:        number | null,
  tjmFallback:       number | null,
): number | null {
  if (contractType === 'employee' && salaireAnnuelBrut) {
    return Math.round(salaireAnnuelBrut * (1 + chargesPct / 100) / joursTravailles)
  }
  if (contractType === 'freelance') {
    return tjmFacture ?? tjmFallback ?? null
  }
  return tjmFallback ?? null
}

export function ConsultantForm({ consultant, onClose, onSaved }: Props) {
  const { user } = useAuthContext()
  const isEdit   = !!consultant

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    name:               '',
    initials:           '',
    email:              '',
    role:               '',
    avatar_color:       'green',
    stack:              '',
    status:             'available',
    // Contrat
    contract_type:      'employee' as ContractType,
    // Employee
    salaire_annuel_brut: '',
    charges_pct:         '42',
    jours_travailles:    '218',
    // Freelance
    tjm_facture:        '',
    // Commun
    tjm:                '',   // fallback legacy
    tjm_cible:          '',
    leave_days_total:   '25',
  })

  useEffect(() => {
    if (consultant) {
      setForm({
        name:                consultant.name,
        initials:            consultant.initials,
        email:               consultant.email ?? '',
        role:                consultant.role,
        avatar_color:        consultant.avatarColor,
        stack:               consultant.stack?.join(', ') ?? '',
        status:              consultant.status,
        contract_type:       consultant.contractType ?? 'employee',
        salaire_annuel_brut: consultant.salaireAnnuelBrut?.toString() ?? '',
        charges_pct:         consultant.chargesPct?.toString() ?? '42',
        jours_travailles:    consultant.joursTravailles?.toString() ?? '218',
        tjm_facture:         consultant.tjmFacture?.toString() ?? '',
        tjm:                 consultant.tjm?.toString() ?? '',
        tjm_cible:           consultant.tjmCible?.toString() ?? '',
        leave_days_total:    consultant.leaveDaysTotal?.toString() ?? '25',
      })
    }
  }, [consultant])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleName = (v: string) => {
    const parts    = v.trim().split(' ')
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : v.slice(0, 2).toUpperCase()
    setForm(f => ({ ...f, name: v, initials }))
  }

  // ── Coût journalier calculé en live ──────────────────────────────────────
  const tjmCoutReel = useMemo(() => calcTjmCoutReel(
    form.contract_type,
    form.salaire_annuel_brut ? parseFloat(form.salaire_annuel_brut) : null,
    parseFloat(form.charges_pct) || 42,
    parseInt(form.jours_travailles) || 218,
    form.tjm_facture ? parseFloat(form.tjm_facture) : null,
    form.tjm ? parseFloat(form.tjm) : null,
  ), [form.contract_type, form.salaire_annuel_brut, form.charges_pct, form.jours_travailles, form.tjm_facture, form.tjm])

  // ── Écart tjm_cible vs coût réel ─────────────────────────────────────────
  const margeCible = useMemo(() => {
    if (!form.tjm_cible || !tjmCoutReel) return null
    const cible = parseFloat(form.tjm_cible)
    return Math.round((cible - tjmCoutReel) / cible * 100)
  }, [form.tjm_cible, tjmCoutReel])

  const isEmployee  = form.contract_type === 'employee'
  const isFreelance = form.contract_type === 'freelance'

  const handleSubmit = async () => {
    if (!form.name || !form.role) { setError('Name and role are required'); return }
    setLoading(true)
    setError(null)
    try {
      const payload = {
        name:               form.name.trim(),
        initials:           form.initials.trim(),
        email:              form.email.trim() || undefined,
        role:               form.role.trim(),
        avatar_color:       form.avatar_color,
        stack:              form.stack ? form.stack.split(',').map(s => s.trim()).filter(Boolean) : [],
        status:             form.status as any,
        contract_type:      form.contract_type,
        // Employee
        salaire_annuel_brut: isEmployee && form.salaire_annuel_brut ? parseFloat(form.salaire_annuel_brut) : undefined,
        charges_pct:         isEmployee ? parseFloat(form.charges_pct) || 42 : undefined,
        jours_travailles:    isEmployee ? parseInt(form.jours_travailles) || 218 : undefined,
        // Freelance
        tjm_facture:         isFreelance && form.tjm_facture ? parseFloat(form.tjm_facture) : undefined,
        // Commun
        tjm:                 form.tjm ? parseFloat(form.tjm) : undefined,
        tjm_cible:           form.tjm_cible ? parseFloat(form.tjm_cible) : undefined,
        leave_days_total:    parseInt(form.leave_days_total) || 25,
      }

      if (isEdit) {
        await updateConsultant(consultant!.id, payload)
      } else {
        await createConsultant({ ...payload, company_id: user?.companyId ?? undefined })
      }

      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199 }} />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
        background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: 28, overflowY: 'auto',
        boxShadow: '-4px 0 20px var(--shadow)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
            {isEdit ? '// edit consultant' : '// new consultant'}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Identité ─────────────────────────────────────────────── */}
          <SectionLabel>Identité</SectionLabel>

          <Field label="Name *">
            <input className="search-input" style={{ width: '100%' }} placeholder="Alice Martin"
              value={form.name} onChange={e => handleName(e.target.value)} />
          </Field>

          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Initials" style={{ flex: 1 }}>
              <input className="search-input" style={{ width: '100%' }} placeholder="AM" maxLength={3}
                value={form.initials} onChange={e => set('initials', e.target.value.toUpperCase())} />
            </Field>
            <Field label="Color" style={{ flex: 2 }}>
              <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => set('avatar_color', c)} style={{
                    width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: `var(--${c})`,
                    outline: form.avatar_color === c ? '2px solid var(--text)' : 'none',
                    outlineOffset: 2,
                  }} />
                ))}
              </div>
            </Field>
          </div>

          <Field label="Role *">
            <input className="search-input" style={{ width: '100%' }} placeholder="Data Engineer"
              value={form.role} onChange={e => set('role', e.target.value)} />
          </Field>

          <Field label="Email">
            <input className="search-input" style={{ width: '100%' }} placeholder="alice@company.com" type="email"
              value={form.email} onChange={e => set('email', e.target.value)} />
          </Field>

          <Field label="Stack (virgule-séparée)">
            <input className="search-input" style={{ width: '100%' }} placeholder="Python, Kafka, Spark"
              value={form.stack} onChange={e => set('stack', e.target.value)} />
          </Field>

          <Field label="Status">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUSES.map(s => (
                <button key={s} className={`btn btn-sm ${form.status === s ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => set('status', s)}>{s}</button>
              ))}
            </div>
          </Field>

          {/* ── Contrat ──────────────────────────────────────────────── */}
          <SectionLabel>Contrat</SectionLabel>

          <Field label="Type de contrat">
            <div style={{ display: 'flex', gap: 6 }}>
              {(['employee', 'freelance'] as ContractType[]).map(t => (
                <button key={t} className={`btn btn-sm ${form.contract_type === t ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => set('contract_type', t)}>
                  {t === 'employee' ? '👤 Salarié' : '🔗 Freelance'}
                </button>
              ))}
            </div>
          </Field>

          {/* Employee — coût basé sur salaire */}
          {isEmployee && (
            <>
              <Field label="Salaire brut annuel (€)">
                <input className="search-input" style={{ width: '100%' }} placeholder="55 000" type="number"
                  value={form.salaire_annuel_brut} onChange={e => set('salaire_annuel_brut', e.target.value)} />
              </Field>

              <div style={{ display: 'flex', gap: 10 }}>
                <Field label="Charges patronales (%)" style={{ flex: 1 }}>
                  <input className="search-input" style={{ width: '100%' }} type="number" step="0.5"
                    value={form.charges_pct} onChange={e => set('charges_pct', e.target.value)} />
                </Field>
                <Field label="Jours travaillés / an" style={{ flex: 1 }}>
                  <input className="search-input" style={{ width: '100%' }} type="number"
                    value={form.jours_travailles} onChange={e => set('jours_travailles', e.target.value)} />
                </Field>
              </div>
            </>
          )}

          {/* Freelance — TJM facturé */}
          {isFreelance && (
            <Field label="TJM facturé (€/j)">
              <input className="search-input" style={{ width: '100%' }} placeholder="650" type="number"
                value={form.tjm_facture} onChange={e => set('tjm_facture', e.target.value)} />
            </Field>
          )}

          {/* Coût journalier calculé — lecture seule */}
          {tjmCoutReel !== null && (
            <div style={{
              padding: '10px 14px', borderRadius: 6,
              background: 'var(--bg3)', border: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Coût journalier réel
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--cyan)' }}>
                {tjmCoutReel} €/j
              </span>
            </div>
          )}

          {/* ── Objectif commercial ──────────────────────────────────── */}
          <SectionLabel>Objectif</SectionLabel>

          <Field label="TJM cible (€/j)">
            <input className="search-input" style={{ width: '100%' }} placeholder="750" type="number"
              value={form.tjm_cible} onChange={e => set('tjm_cible', e.target.value)} />
          </Field>

          {/* Indicateur marge cible */}
          {margeCible !== null && (
            <div style={{
              padding: '8px 14px', borderRadius: 6,
              background: margeCible >= 20
                ? 'rgba(0,255,136,.08)' : margeCible >= 10
                ? 'rgba(255,209,102,.08)' : 'rgba(255,45,107,.08)',
              border: `1px solid ${margeCible >= 20 ? 'rgba(0,255,136,.2)' : margeCible >= 10 ? 'rgba(255,209,102,.2)' : 'rgba(255,45,107,.2)'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Marge cible
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                color: margeCible >= 20 ? 'var(--green)' : margeCible >= 10 ? 'var(--gold)' : 'var(--pink)',
              }}>
                {margeCible}%
              </span>
            </div>
          )}

          {/* Fallback TJM legacy */}
          <Field label="TJM (legacy / fallback €/j)" >
            <input className="search-input" style={{ width: '100%', opacity: 0.6 }} placeholder="optionnel" type="number"
              value={form.tjm} onChange={e => set('tjm', e.target.value)} />
          </Field>

          {/* ── Congés — masqués pour freelance ─────────────────────── */}
          {isEmployee && (
            <>
              <SectionLabel>Congés</SectionLabel>
              <Field label="Jours CP / an">
                <input className="search-input" style={{ width: '100%' }} type="number"
                  value={form.leave_days_total} onChange={e => set('leave_days_total', e.target.value)} />
              </Field>
            </>
          )}

          {/* ── Erreur + Actions ─────────────────────────────────────── */}
          {error && (
            <div style={{ fontSize: 11, color: 'var(--pink)', padding: '8px 12px', background: 'rgba(255,45,107,0.08)', borderRadius: 4 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? '...' : isEdit ? '✓ Save changes' : '✓ Create consultant'}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>

        </div>
      </div>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 3,
      textTransform: 'uppercase', color: 'var(--text3)',
      borderBottom: '1px solid var(--border)', paddingBottom: 6, marginTop: 4,
    }}>
      {children}
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  )
}