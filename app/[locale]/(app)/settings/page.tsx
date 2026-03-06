'use client'

import { useState, useEffect } from 'react'
import { useTranslations }  from 'next-intl'
import { useAuthContext }   from '@/components/layout/AuthProvider'
import { useActiveTenant }  from '@/lib/tenant-context'
import { isAdmin, isSuperAdmin } from '@/lib/auth'
import { useRouter }        from '@/lib/navigation'
import { Topbar }           from '@/components/layout/Topbar'
import { Avatar }           from '@/components/ui/Avatar'
import {
  useTeams, useConsultants,
  createTeam, updateTeam, deleteTeam,
  addTeamMember, removeTeamMember,
  useCompanySettings, updateCompanySettings, updateAISettings, updateHRSettings,
} from '@/lib/data'
import type { Team, TeamMember, CompanySettings, BillingSettings, AISettings, HRSettings, PublicHoliday } from '@/lib/data'

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 9, color: 'var(--text2)', letterSpacing: 3,
      textTransform: 'uppercase', marginBottom: 16,
    }}>
      // {label}
    </div>
  )
}

// ── Stub section ──────────────────────────────────────────────
function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{
      padding: '48px 24px', textAlign: 'center',
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 4,
    }}>
      <div style={{ fontSize: 20, marginBottom: 12, opacity: 0.4 }}>⚙</div>
      <div style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
        // {label} — coming soon
      </div>
    </div>
  )
}

// ── Form helpers ──────────────────────────────────────────────
function SettingsField({
  label, hint, children,
}: {
  label: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
        color: 'var(--text2)',
      }}>
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 9, color: 'var(--text2)', opacity: 0.7 }}>{hint}</div>
      )}
    </div>
  )
}

function SettingsInput({
  value, onChange, placeholder, type = 'text', disabled,
}: {
  value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', background: 'var(--bg3)',
        border: '1px solid var(--border2)',
        color: disabled ? 'var(--text2)' : 'var(--text)',
        padding: '8px 12px', borderRadius: 2,
        fontSize: 12, fontFamily: 'inherit',
        opacity: disabled ? 0.6 : 1,
      }}
    />
  )
}

function SettingsTextarea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string; onChange: (v: string) => void
  placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', background: 'var(--bg3)',
        border: '1px solid var(--border2)',
        color: 'var(--text)', padding: '8px 12px', borderRadius: 2,
        fontSize: 12, fontFamily: 'inherit', resize: 'vertical',
      }}
    />
  )
}

function SaveBar({
  dirty, saving, onSave, onReset,
}: {
  dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void
}) {
  if (!dirty && !saving) return null
  return (
    <div style={{
      position: 'sticky', bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px',
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 4, marginTop: 8,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 1 }}>
        // unsaved changes
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onReset} disabled={saving}>
          Reset
        </button>
        <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
          {saving ? '...' : '✓ Save changes'}
        </button>
      </div>
    </div>
  )
}

function Skeleton({ h = 60 }: { h?: number }) {
  return <div style={{ height: h, background: 'var(--bg3)', borderRadius: 4 }} />
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    manager:    { bg: 'rgba(255,209,102,0.1)', color: 'var(--gold)', border: 'rgba(255,209,102,0.3)' },
    admin:      { bg: 'rgba(255,45,107,0.1)',  color: 'var(--pink)', border: 'rgba(255,45,107,0.3)' },
    consultant: { bg: 'rgba(255,255,255,0.05)', color: 'var(--text2)', border: 'var(--border)' },
    freelance:  { bg: 'rgba(0,229,255,0.08)',  color: 'var(--cyan)',  border: 'rgba(0,229,255,0.25)' },
  }
  const s = colors[role] ?? colors.consultant
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
      padding: '2px 6px', borderRadius: 2,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {role}
    </span>
  )
}

// ══════════════════════════════════════════════════════════════
// TEAM CARD
// ══════════════════════════════════════════════════════════════

function TeamCard({
  team,
  consultants,
  onEdit,
  onDelete,
  onAddMember,
  onRemoveMember,
}: {
  team:           Team
  consultants:    any[]
  onEdit:         (team: Team) => void
  onDelete:       (team: Team) => void
  onAddMember:    (teamId: string, consultantId: string) => void
  onRemoveMember: (consultantId: string, teamName: string) => void
}) {
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedConsultantId, setSelectedConsultantId] = useState('')

  // Consultants pas encore dans cette équipe (ou dans une autre)
  const memberIds = new Set(team.members.map(m => m.id))
  const available = consultants.filter(c =>
    !memberIds.has(c.id) &&
    (c.role === 'consultant' || c.role === 'freelance' || c.role === 'manager')
  )

  const handleAdd = async () => {
    if (!selectedConsultantId) return
    await onAddMember(team.id, selectedConsultantId)
    setSelectedConsultantId('')
    setShowAddMember(false)
  }

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 4, overflow: 'hidden',
    }}>
      {/* Header équipe */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 3,
            background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: 'var(--cyan)',
          }}>
            ◈
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{team.name}</div>
            {team.description && (
              <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                {team.description}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text2)' }}>
            {team.members.length} membre{team.members.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => onEdit(team)}
            style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 2,
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Modifier
          </button>
          <button
            onClick={() => onDelete(team)}
            style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 2,
              background: 'none', border: '1px solid rgba(255,45,107,0.3)',
              color: 'var(--pink)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Supprimer
          </button>
        </div>
      </div>

      {/* Manager */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid var(--border)',
        background: 'rgba(255,209,102,0.03)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', minWidth: 60 }}>
          Manager
        </span>
        {team.managerId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar
              initials={team.managerInitials ?? '??'}
              color={(team.managerAvatarColor ?? 'green') as any}
              size="sm"
            />
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
              {team.managerName}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic' }}>
            — non défini
          </span>
        )}
      </div>

      {/* Membres */}
      <div style={{ padding: '12px 20px' }}>
        <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 10 }}>
          Membres
        </div>

        {team.members.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic', marginBottom: 10 }}>
            Aucun membre — ajoutez des consultants ci-dessous
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {team.members.map(member => (
              <div key={member.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: 3,
                background: 'var(--bg3)', border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar
                    initials={member.initials}
                    color={(member.avatar_color ?? 'green') as any}
                    size="sm"
                  />
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text2)' }}>{member.role}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <RoleBadge role={member.contract_type} />
                  <button
                    onClick={() => onRemoveMember(member.id, team.name)}
                    style={{
                      fontSize: 9, padding: '2px 8px', borderRadius: 2,
                      background: 'none', border: '1px solid rgba(255,45,107,0.2)',
                      color: 'var(--pink)', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter un membre */}
        {showAddMember ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={selectedConsultantId}
              onChange={e => setSelectedConsultantId(e.target.value)}
              style={{
                flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)',
                color: 'var(--text)', padding: '6px 10px', borderRadius: 2,
                fontSize: 11, fontFamily: 'inherit',
              }}
            >
              <option value="">Sélectionner un consultant…</option>
              {available.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.role}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!selectedConsultantId}
              style={{
                fontSize: 10, padding: '6px 12px', borderRadius: 2,
                background: 'var(--green)', color: '#000', border: 'none',
                cursor: selectedConsultantId ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', fontWeight: 700,
                opacity: selectedConsultantId ? 1 : 0.5,
              }}
            >
              Ajouter
            </button>
            <button
              onClick={() => { setShowAddMember(false); setSelectedConsultantId('') }}
              style={{
                fontSize: 10, padding: '6px 10px', borderRadius: 2,
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddMember(true)}
            style={{
              fontSize: 10, padding: '6px 12px', borderRadius: 2,
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Ajouter un membre
          </button>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TEAM FORM MODAL
// ══════════════════════════════════════════════════════════════

function TeamForm({
  initial,
  managers,
  companyId,
  onSave,
  onClose,
}: {
  initial?:  Team | null
  managers:  any[]
  companyId: string
  onSave:    () => void
  onClose:   () => void
}) {
  const [name,        setName]        = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [managerId,   setManagerId]   = useState(initial?.managerId ?? '')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Le nom est requis.'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        company_id:  companyId,
        name:        name.trim(),
        description: description.trim() || null,
        manager_id:  managerId || null,
      }
      if (initial) {
        await updateTeam(initial.id, payload)
      } else {
        await createTeam(payload)
      }
      onSave()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 6, padding: 32, width: 480, maxWidth: '90vw',
      }}>
        <div style={{ fontSize: 9, color: 'var(--cyan)', letterSpacing: 3, marginBottom: 16 }}>
          // {initial ? 'MODIFIER_ÉQUIPE' : 'NOUVELLE_ÉQUIPE'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Nom */}
          <div>
            <label style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Nom de l'équipe *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Équipe Java, Pôle Data, Paris…"
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)',
                color: 'var(--text)', padding: '8px 12px', borderRadius: 2,
                fontSize: 12, fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Description
            </label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optionnel — ex: Équipe backend Java Spring"
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)',
                color: 'var(--text)', padding: '8px 12px', borderRadius: 2,
                fontSize: 12, fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Manager */}
          <div>
            <label style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Manager
            </label>
            <select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)',
                color: 'var(--text)', padding: '8px 12px', borderRadius: 2,
                fontSize: 12, fontFamily: 'inherit',
              }}
            >
              <option value="">— Aucun manager assigné</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 4 }}>
              Seuls les consultants avec le rôle manager sont listés.
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 11, color: 'var(--pink)', padding: '8px 12px', background: 'rgba(255,45,107,0.08)', borderRadius: 2 }}>
              ⚠ {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={onClose}
              style={{
                fontSize: 11, padding: '8px 16px', borderRadius: 2,
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              style={{
                fontSize: 11, padding: '8px 16px', borderRadius: 2,
                background: saving ? 'var(--bg3)' : 'var(--cyan)',
                color: saving ? 'var(--text2)' : '#000',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
              }}
            >
              {saving ? 'Enregistrement…' : initial ? 'Modifier' : 'Créer l\'équipe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// HR — CONSTANTES & COMPOSANTS
// ══════════════════════════════════════════════════════════════

const COUNTRIES = [
  { code: 'FR', flag: '🇫🇷', label: 'France' },
  { code: 'BE', flag: '🇧🇪', label: 'Belgique' },
  { code: 'CH', flag: '🇨🇭', label: 'Suisse' },
  { code: 'LU', flag: '🇱🇺', label: 'Luxembourg' },
  { code: 'DE', flag: '🇩🇪', label: 'Allemagne' },
  { code: 'GB', flag: '🇬🇧', label: 'United Kingdom' },
  { code: 'US', flag: '🇺🇸', label: 'United States' },
]

const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

function ToggleRow({
  label, hint, checked, onChange,
}: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none',
          background: checked ? 'var(--green)' : 'var(--border2)',
          cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3,
          left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%',
          background: '#000', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PAGE SETTINGS
// ══════════════════════════════════════════════════════════════

type Tab = 'company' | 'team' | 'hr' | 'billing' | 'ai' | 'superadmin'

const TABS: { id: Tab; label: string; icon: string; adminOnly?: boolean; superOnly?: boolean }[] = [
  { id: 'company',    label: 'Company',    icon: '🏢' },
  { id: 'team',       label: 'Team',       icon: '◈' },
  { id: 'hr',         label: 'HR',         icon: '📅' },
  { id: 'billing',    label: 'Billing',    icon: '🧾' },
  { id: 'ai',         label: 'AI & MCP',   icon: '🤖' },
  { id: 'superadmin', label: 'Super Admin', icon: '⬡', superOnly: true },
]

export default function SettingsPage() {
  const { user } = useAuthContext()
  const { activeTenantId } = useActiveTenant()
  const router      = useRouter()
  const adminAccess = isAdmin(user?.role)
  const superAccess = isSuperAdmin(user?.role)

  useEffect(() => {
    if (user && !adminAccess) {
      router.push('/dashboard' as never)
    }
  }, [user, adminAccess, router])

  if (!user || !adminAccess) return null

  const [activeTab,  setActiveTab]  = useState<Tab>('company')
  const [refresh,    setRefresh]    = useState(0)
  const [settingsRefresh, setSettingsRefresh] = useState(0)

  // ── Company settings data ──────────────────────────────────
  const { data: companyData, loading: lS } = useCompanySettings(settingsRefresh)

  // Company tab state
  const [companyName,    setCompanyName]    = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companySiret,   setCompanySiret]   = useState('')
  const [companyTva,     setCompanyTva]     = useState('')

  // Billing tab state
  const [iban,          setIban]          = useState('')
  const [bic,           setBic]           = useState('')
  const [bankName,      setBankName]      = useState('')
  const [invoicePrefix, setInvoicePrefix] = useState('')
  const [paymentTerms,  setPaymentTerms]  = useState('')
  const [legalMention,  setLegalMention]  = useState('')
  const [tvaRate,       setTvaRate]       = useState('')

  // AI tab state
  const [ollamaEndpoint, setOllamaEndpoint] = useState('')
  const [ollamaModel,    setOllamaModel]    = useState('')
  const [agentsEnabled,  setAgentsEnabled]  = useState(false)

  // HR tab state
  const [hrCountry,      setHrCountry]      = useState('FR')
  const [hrCp,           setHrCp]           = useState('25')
  const [hrRtt,          setHrRtt]          = useState('10')
  const [hrWorkDays,     setHrWorkDays]     = useState('218')
  const [hrCraDeadline,  setHrCraDeadline]  = useState('5')
  const [hrAutoApprove,  setHrAutoApprove]  = useState(false)
  const [holidays,       setHolidays]       = useState<PublicHoliday[]>([])
  const [holidaysLoading, setHolidaysLoading] = useState(false)

  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError,  setSettingsError]  = useState<string | null>(null)

  // Sync state when data loads
  useEffect(() => {
    if (!companyData) return
    const b  = companyData.billing_settings ?? {}
    const ai = companyData.ai_settings ?? {}
    const hr = companyData.hr_settings ?? {}
    setCompanyName(companyData.name ?? '')
    setCompanyAddress(b.address ?? '')
    setCompanySiret(b.siret ?? '')
    setCompanyTva(b.tva_number ?? '')
    setIban(b.bank_iban ?? '')
    setBic(b.bank_bic ?? '')
    setBankName(b.bank_name ?? '')
    setInvoicePrefix(b.invoice_prefix ?? '')
    setPaymentTerms(String(b.payment_terms ?? 30))
    setLegalMention(b.legal_mention ?? '')
    setTvaRate(String(b.tva_rate ?? 20))
    setOllamaEndpoint(ai.ollama_endpoint ?? '')
    setOllamaModel(ai.ollama_model ?? 'kimi-k2.5:cloud')
    setAgentsEnabled(ai.agents_enabled ?? false)
    setHrCountry(hr.country_code ?? 'FR')
    setHrCp(String(hr.default_cp ?? 25))
    setHrRtt(String(hr.default_rtt ?? 10))
    setHrWorkDays(String(hr.working_days_per_year ?? 218))
    setHrCraDeadline(String(hr.cra_submission_deadline ?? 5))
    setHrAutoApprove(hr.leave_auto_approve ?? false)
  }, [companyData])

  // Fetch jours fériés depuis l'API Nager au changement de pays
  useEffect(() => {
    const year = new Date().getFullYear()
    setHolidaysLoading(true)
    fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${hrCountry}`)
      .then(r => r.json())
      .then(data => setHolidays(Array.isArray(data) ? data : []))
      .catch(() => setHolidays([]))
      .finally(() => setHolidaysLoading(false))
  }, [hrCountry])

  // Dirty detection
  const b  = companyData?.billing_settings ?? {}
  const ai = companyData?.ai_settings ?? {}
  const hr = (companyData?.hr_settings ?? {}) as Partial<HRSettings>

  const companyDirty = companyData ? (
    companyName    !== (companyData.name ?? '') ||
    companyAddress !== (b.address    ?? '') ||
    companySiret   !== (b.siret      ?? '') ||
    companyTva     !== (b.tva_number ?? '')
  ) : false

  const billingDirty = companyData ? (
    iban          !== (b.bank_iban      ?? '') ||
    bic           !== (b.bank_bic       ?? '') ||
    bankName      !== (b.bank_name      ?? '') ||
    invoicePrefix !== (b.invoice_prefix ?? '') ||
    paymentTerms  !== String(b.payment_terms ?? 30) ||
    legalMention  !== (b.legal_mention  ?? '') ||
    tvaRate       !== String(b.tva_rate ?? 20)
  ) : false

  const aiDirty = companyData ? (
    ollamaEndpoint !== (ai.ollama_endpoint ?? '') ||
    ollamaModel    !== (ai.ollama_model    ?? 'kimi-k2.5:cloud') ||
    agentsEnabled  !== (ai.agents_enabled  ?? false)
  ) : false

  const hrDirty = companyData ? (
    hrCountry     !== (hr.country_code               ?? 'FR')  ||
    hrCp          !== String(hr.default_cp            ?? 25)   ||
    hrRtt         !== String(hr.default_rtt           ?? 10)   ||
    hrWorkDays    !== String(hr.working_days_per_year  ?? 218)  ||
    hrCraDeadline !== String(hr.cra_submission_deadline ?? 5)  ||
    hrAutoApprove !== (hr.leave_auto_approve          ?? false)
  ) : false

  const handleSaveCompany = async () => {
    setSettingsSaving(true)
    setSettingsError(null)
    try {
      await updateCompanySettings({
        name: companyName,
        billing_settings: { address: companyAddress, siret: companySiret, tva_number: companyTva },
        companyId: activeTenantId ?? undefined,
      })
      setSettingsRefresh(r => r + 1)
    } catch (e: any) {
      setSettingsError(e.message)
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleSaveBilling = async () => {
    setSettingsSaving(true)
    setSettingsError(null)
    try {
      await updateCompanySettings({
        billing_settings: {
          bank_iban: iban, bank_bic: bic, bank_name: bankName,
          invoice_prefix: invoicePrefix, payment_terms: Number(paymentTerms),
          legal_mention: legalMention, tva_rate: Number(tvaRate),
        },
        companyId: activeTenantId ?? undefined,
      })
      setSettingsRefresh(r => r + 1)
    } catch (e: any) {
      setSettingsError(e.message)
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleSaveAI = async () => {
    setSettingsSaving(true)
    setSettingsError(null)
    try {
      await updateAISettings({
        ai_settings: {
          ollama_endpoint: ollamaEndpoint,
          ollama_model:    ollamaModel,
          agents_enabled:  agentsEnabled,
        },
        companyId: activeTenantId ?? undefined,
      })
      setSettingsRefresh(r => r + 1)
    } catch (e: any) {
      setSettingsError(e.message)
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleResetAI = () => {
    if (!companyData) return
    const ai = companyData.ai_settings ?? {}
    setOllamaEndpoint(ai.ollama_endpoint ?? '')
    setOllamaModel(ai.ollama_model ?? 'kimi-k2.5:cloud')
    setAgentsEnabled(ai.agents_enabled ?? false)
  }

  const handleSaveHR = async () => {
    setSettingsSaving(true)
    setSettingsError(null)
    try {
      await updateHRSettings({
        hr_settings: {
          country_code:            hrCountry,
          default_cp:              Number(hrCp),
          default_rtt:             Number(hrRtt),
          working_days_per_year:   Number(hrWorkDays),
          cra_submission_deadline: Number(hrCraDeadline),
          leave_auto_approve:      hrAutoApprove,
        },
        companyId: activeTenantId ?? undefined,
      })
      setSettingsRefresh(r => r + 1)
    } catch (e: any) {
      setSettingsError(e.message)
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleResetHR = () => {
    if (!companyData) return
    const hr = companyData.hr_settings ?? {}
    setHrCountry(hr.country_code ?? 'FR')
    setHrCp(String(hr.default_cp ?? 25))
    setHrRtt(String(hr.default_rtt ?? 10))
    setHrWorkDays(String(hr.working_days_per_year ?? 218))
    setHrCraDeadline(String(hr.cra_submission_deadline ?? 5))
    setHrAutoApprove(hr.leave_auto_approve ?? false)
  }

  const handleResetCompany = () => {
    if (!companyData) return
    const bs = companyData.billing_settings ?? {}
    setCompanyName(companyData.name ?? '')
    setCompanyAddress(bs.address ?? '')
    setCompanySiret(bs.siret ?? '')
    setCompanyTva(bs.tva_number ?? '')
  }

  const handleResetBilling = () => {
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
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<Team | null>(null)
  const [confirmDel, setConfirmDel] = useState<Team | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const { data: teams,       loading: lT } = useTeams(refresh)
  const { data: consultants, loading: lC } = useConsultants(refresh)

  const allConsultants = consultants ?? []

  const managers = allConsultants.filter(c =>
    c.role?.toLowerCase().includes('manager') ||
    c.role?.toLowerCase().includes('lead') ||
    c.role?.toLowerCase().includes('directeur')
  )

  const handleRefresh = () => setRefresh(r => r + 1)

  const handleAddMember = async (teamId: string, consultantId: string) => {
    try {
      await addTeamMember(teamId, consultantId)
      handleRefresh()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleRemoveMember = async (consultantId: string, teamName: string) => {
    if (!confirm(`Retirer ce consultant de l'équipe "${teamName}" ?`)) return
    try {
      await removeTeamMember(consultantId)
      handleRefresh()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await deleteTeam(confirmDel.id)
      setConfirmDel(null)
      handleRefresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const teamCount  = (teams ?? []).length
  const unassigned = allConsultants.filter(c => !(c as any).teamId && (c.role !== 'admin')).length

  // Tabs visibles selon le rôle
  const visibleTabs = TABS.filter(tab => {
    if (tab.superOnly) return superAccess
    return true
  })

  // CTA selon l'onglet actif
  const ctaLabel = activeTab === 'team' ? '+ Nouvelle équipe' : undefined
  const onCta    = activeTab === 'team' ? () => { setEditTarget(null); setShowForm(true) } : undefined

  return (
    <>
      <Topbar
        title="Settings"
        breadcrumb="// configuration"
        ctaLabel={ctaLabel}
        onCta={onCta}
      />

      <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex', gap: 2,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 0,
        }}>
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                fontSize: 11, padding: '8px 16px',
                background: 'none', border: 'none',
                borderBottom: activeTab === tab.id
                  ? '2px solid var(--cyan)'
                  : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--cyan)' : 'var(--text2)',
                cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: activeTab === tab.id ? 700 : 400,
                transition: 'color 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
                marginBottom: -1,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            TAB: COMPANY
        ══════════════════════════════════════════════════ */}
        {activeTab === 'company' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {settingsError && (
              <div style={{
                padding: '8px 14px', borderRadius: 4,
                background: 'rgba(255,45,107,0.08)', border: '1px solid rgba(255,45,107,0.2)',
                fontSize: 11, color: 'var(--pink)',
              }}>
                ⚠ {settingsError}
              </div>
            )}

            {/* Identité */}
            <section>
              <SectionLabel label="COMPANY_IDENTITY" />
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '20px 24px',
                display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                {lS ? (
                  <Skeleton h={120} />
                ) : (
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
                {lS ? (
                  <Skeleton h={80} />
                ) : (
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

            <SaveBar
              dirty={companyDirty}
              saving={settingsSaving}
              onSave={handleSaveCompany}
              onReset={handleResetCompany}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB: TEAM
        ══════════════════════════════════════════════════ */}
        {activeTab === 'team' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {[
                { label: 'Équipes',      value: teamCount,   color: 'var(--cyan)' },
                { label: 'Consultants',  value: allConsultants.filter(c => c.contractType !== 'freelance').length, color: 'var(--green)' },
                { label: 'Freelances',   value: allConsultants.filter(c => c.contractType === 'freelance').length, color: 'var(--gold)' },
                { label: 'Non assignés', value: unassigned,  color: unassigned > 0 ? 'var(--pink)' : 'var(--text2)' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 4, padding: '16px 20px',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Équipes */}
            <section>
              <SectionLabel label="TEAM_MANAGEMENT" />
              {lT || lC ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Skeleton h={120} />
                  <Skeleton h={120} />
                </div>
              ) : (teams ?? []).length === 0 ? (
                <div style={{
                  padding: '40px 24px', textAlign: 'center',
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 4, color: 'var(--text2)', fontSize: 12,
                }}>
                  <div style={{ fontSize: 24, marginBottom: 12 }}>◈</div>
                  <div style={{ marginBottom: 8 }}>Aucune équipe définie</div>
                  <div style={{ fontSize: 10, marginBottom: 20 }}>
                    Créez votre première équipe pour organiser vos consultants et managers.
                  </div>
                  <button
                    onClick={() => { setEditTarget(null); setShowForm(true) }}
                    style={{
                      fontSize: 11, padding: '8px 20px', borderRadius: 2,
                      background: 'var(--cyan)', color: '#000',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                    }}
                  >
                    + Créer une équipe
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(teams ?? []).map(team => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      consultants={allConsultants}
                      onEdit={t => { setEditTarget(t); setShowForm(true) }}
                      onDelete={t => setConfirmDel(t)}
                      onAddMember={handleAddMember}
                      onRemoveMember={handleRemoveMember}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Consultants non assignés */}
            {unassigned > 0 && (
              <section>
                <SectionLabel label="NON_ASSIGNÉS" />
                <div style={{
                  background: 'var(--bg2)', border: '1px solid rgba(255,209,102,0.2)',
                  borderRadius: 4, padding: '16px 20px',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 12 }}>
                    ⚠ {unassigned} consultant{unassigned > 1 ? 's' : ''} sans équipe
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {allConsultants
                      .filter(c => !(c as any).teamId && c.contractType !== undefined)
                      .map(c => (
                        <div key={c.id} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '5px 10px', borderRadius: 2,
                          background: 'var(--bg3)', border: '1px solid var(--border)',
                        }}>
                          <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
                          <span style={{ fontSize: 11, color: 'var(--text)' }}>{c.name}</span>
                          <RoleBadge role={c.contractType ?? 'consultant'} />
                        </div>
                      ))
                    }
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB: HR
        ══════════════════════════════════════════════════ */}
        {activeTab === 'hr' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {settingsError && (
              <div style={{
                padding: '8px 14px', borderRadius: 4,
                background: 'rgba(255,45,107,0.08)', border: '1px solid rgba(255,45,107,0.2)',
                fontSize: 11, color: 'var(--pink)',
              }}>
                ⚠ {settingsError}
              </div>
            )}

            {/* ── Congés par défaut ── */}
            <section>
              <SectionLabel label="DEFAULT_LEAVE_POLICY" />
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '20px 24px',
                display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                {lS ? <Skeleton h={100} /> : (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                      Valeurs appliquées automatiquement à la création de chaque nouveau consultant.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                      <SettingsField label="CP / an (jours)" hint="Légal FR : 25j minimum">
                        <input
                          type="number" min={0} max={60}
                          value={hrCp}
                          onChange={e => setHrCp(e.target.value)}
                          style={{
                            width: '100%', background: 'var(--bg3)',
                            border: '1px solid var(--border2)', color: 'var(--text)',
                            padding: '8px 12px', borderRadius: 2,
                            fontSize: 12, fontFamily: 'inherit', textAlign: 'right',
                          }}
                        />
                      </SettingsField>
                      <SettingsField label="RTT / an (jours)" hint="Selon accord d'entreprise">
                        <input
                          type="number" min={0} max={30}
                          value={hrRtt}
                          onChange={e => setHrRtt(e.target.value)}
                          style={{
                            width: '100%', background: 'var(--bg3)',
                            border: '1px solid var(--border2)', color: 'var(--text)',
                            padding: '8px 12px', borderRadius: 2,
                            fontSize: 12, fontFamily: 'inherit', textAlign: 'right',
                          }}
                        />
                      </SettingsField>
                      <SettingsField label="Jours travaillés / an" hint="Standard FR : 218j">
                        <input
                          type="number" min={200} max={260}
                          value={hrWorkDays}
                          onChange={e => setHrWorkDays(e.target.value)}
                          style={{
                            width: '100%', background: 'var(--bg3)',
                            border: '1px solid var(--border2)', color: 'var(--text)',
                            padding: '8px 12px', borderRadius: 2,
                            fontSize: 12, fontFamily: 'inherit', textAlign: 'right',
                          }}
                        />
                      </SettingsField>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ── Règles CRA ── */}
            <section>
              <SectionLabel label="CRA_RULES" />
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '0 24px',
              }}>
                {lS ? <div style={{ height: 80, margin: '20px 0', background: 'var(--bg3)', borderRadius: 4 }} /> : (
                  <>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 0', borderBottom: '1px solid var(--border)',
                    }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
                          Deadline soumission CRA
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                          Jour limite du mois suivant pour soumettre son CRA
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="number" min={1} max={28}
                          value={hrCraDeadline}
                          onChange={e => setHrCraDeadline(e.target.value)}
                          style={{
                            width: 56, background: 'var(--bg3)',
                            border: '1px solid var(--border2)', color: 'var(--cyan)',
                            padding: '6px 10px', borderRadius: 2,
                            fontSize: 14, fontFamily: 'var(--font-mono)',
                            textAlign: 'center', fontWeight: 700,
                          }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>du mois</span>
                      </div>
                    </div>
                    <ToggleRow
                      label="Approbation automatique des congés"
                      hint="Si activé, les demandes sont approuvées sans validation manager"
                      checked={hrAutoApprove}
                      onChange={setHrAutoApprove}
                    />
                  </>
                )}
              </div>
            </section>

            {/* ── Jours fériés ── */}
            <section>
              <SectionLabel label="PUBLIC_HOLIDAYS" />
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 4, overflow: 'hidden',
              }}>
                {/* Header sélecteur pays */}
                <div style={{
                  padding: '16px 20px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                      Pays de référence
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                      Jours fériés exclus des CRAs — source : date.nager.at
                    </div>
                  </div>
                  <select
                    value={hrCountry}
                    onChange={e => setHrCountry(e.target.value)}
                    style={{
                      background: 'var(--bg3)', border: '1px solid var(--border2)',
                      color: 'var(--text)', padding: '8px 12px', borderRadius: 2,
                      fontSize: 12, fontFamily: 'inherit', minWidth: 180,
                    }}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Calendrier */}
                {holidaysLoading ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-block', width: 20, height: 20, borderRadius: '50%',
                      border: '2px solid var(--border)', borderTopColor: 'var(--cyan)',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 8, letterSpacing: 1 }}>
                      // fetching holidays…
                    </div>
                  </div>
                ) : holidays.length === 0 ? (
                  <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>
                    Aucun jour férié trouvé pour {hrCountry}
                  </div>
                ) : (() => {
                  const byMonth = holidays.reduce<Record<number, PublicHoliday[]>>((acc, h) => {
                    const m = new Date(h.date).getMonth()
                    if (!acc[m]) acc[m] = []
                    acc[m].push(h)
                    return acc
                  }, {})
                  const weekdays = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
                  return (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                    }}>
                      {Object.entries(byMonth)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([mIdx, mHolidays]) => (
                          <div key={mIdx} style={{
                            padding: '14px 16px',
                            borderRight: '1px solid var(--border)',
                            borderBottom: '1px solid var(--border)',
                          }}>
                            <div style={{
                              fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                              color: 'var(--cyan)', marginBottom: 8, fontWeight: 700,
                            }}>
                              {MONTHS_FR[Number(mIdx)]}
                            </div>
                            {mHolidays.map(h => {
                              const d = new Date(h.date)
                              return (
                                <div key={h.date} style={{
                                  display: 'flex', alignItems: 'baseline',
                                  gap: 6, marginBottom: 5,
                                }}>
                                  <span style={{
                                    fontSize: 11, fontFamily: 'var(--font-mono)',
                                    color: 'var(--text)', fontWeight: 700, minWidth: 22,
                                  }}>
                                    {d.getDate()}
                                  </span>
                                  <span style={{ fontSize: 9, color: 'var(--text2)', minWidth: 22 }}>
                                    {weekdays[d.getDay()]}
                                  </span>
                                  <span style={{ fontSize: 10, color: 'var(--text)', lineHeight: 1.3 }}>
                                    {h.localName}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        ))
                      }
                    </div>
                  )
                })()}

                {/* Footer */}
                {!holidaysLoading && holidays.length > 0 && (
                  <div style={{
                    padding: '10px 20px', borderTop: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 10, color: 'var(--text2)' }}>
                      {holidays.length} jours fériés en {new Date().getFullYear()}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--text2)', opacity: 0.5, letterSpacing: 1 }}>
                      source: date.nager.at
                    </span>
                  </div>
                )}
              </div>
            </section>

            <SaveBar
              dirty={hrDirty}
              saving={settingsSaving}
              onSave={handleSaveHR}
              onReset={handleResetHR}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB: BILLING
        ══════════════════════════════════════════════════ */}
        {activeTab === 'billing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {settingsError && (
              <div style={{
                padding: '8px 14px', borderRadius: 4,
                background: 'rgba(255,45,107,0.08)', border: '1px solid rgba(255,45,107,0.2)',
                fontSize: 11, color: 'var(--pink)',
              }}>
                ⚠ {settingsError}
              </div>
            )}

            {/* Coordonnées bancaires */}
            <section>
              <SectionLabel label="BANK_DETAILS" />
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '20px 24px',
                display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                {lS ? <Skeleton h={120} /> : (
                  <>
                    <SettingsField label="IBAN">
                      <SettingsInput
                        value={iban}
                        onChange={setIban}
                        placeholder="FR76 1234 5678 9012 3456 7890 123"
                      />
                    </SettingsField>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <SettingsField label="BIC / SWIFT">
                        <SettingsInput
                          value={bic}
                          onChange={setBic}
                          placeholder="BNPAFRPPXXX"
                        />
                      </SettingsField>
                      <SettingsField label="Bank name">
                        <SettingsInput
                          value={bankName}
                          onChange={setBankName}
                          placeholder="BNP Paribas"
                        />
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
                {lS ? <Skeleton h={120} /> : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                      <SettingsField label="Invoice prefix" hint="e.g. NEX-2026-">
                        <SettingsInput
                          value={invoicePrefix}
                          onChange={setInvoicePrefix}
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
                          value={paymentTerms}
                          onChange={setPaymentTerms}
                          type="number"
                          placeholder="30"
                        />
                      </SettingsField>
                    </div>
                  </>
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
                {lS ? <Skeleton h={120} /> : (
                  <>
                    <SettingsField label="TVA rate (%)" hint="Set to 0 for auto-entrepreneur (non assujetti)">
                      <SettingsInput
                        value={tvaRate}
                        onChange={setTvaRate}
                        type="number"
                        placeholder="20"
                      />
                    </SettingsField>
                    <SettingsField label="Legal mention" hint="Appears at the bottom of every invoice">
                      <SettingsTextarea
                        value={legalMention}
                        onChange={setLegalMention}
                        placeholder="Auto-entrepreneur — dispensé d'immatriculation au RCS..."
                        rows={3}
                      />
                    </SettingsField>
                  </>
                )}
              </div>
            </section>

            <SaveBar
              dirty={billingDirty}
              saving={settingsSaving}
              onSave={handleSaveBilling}
              onReset={handleResetBilling}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB: AI & MCP
        ══════════════════════════════════════════════════ */}
        {activeTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {settingsError && (
              <div style={{
                padding: '8px 14px', borderRadius: 4,
                background: 'rgba(255,45,107,0.08)', border: '1px solid rgba(255,45,107,0.2)',
                fontSize: 11, color: 'var(--pink)',
              }}>⚠ {settingsError}</div>
            )}

            {/* Modèle Ollama */}
            <section>
              <SectionLabel label="AI_MODEL" />
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '20px 24px',
                display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                {lS ? <Skeleton h={100} /> : (
                  <>
                    <SettingsField
                      label="Ollama endpoint"
                      hint="URL de ton instance Ollama — local ou cloud"
                    >
                      <SettingsInput
                        value={ollamaEndpoint}
                        onChange={setOllamaEndpoint}
                        placeholder="https://ollama.yourdomain.com"
                      />
                    </SettingsField>

                    <SettingsField label="Model" hint="Modèle utilisé par le /cmd AI console">
                      <select
                        value={ollamaModel}
                        onChange={e => setOllamaModel(e.target.value)}
                        style={{
                          width: '100%', background: 'var(--bg3)',
                          border: '1px solid var(--border2)',
                          color: 'var(--text)', padding: '8px 12px', borderRadius: 2,
                          fontSize: 12, fontFamily: 'inherit',
                        }}
                      >
                        {[
                          'kimi-k2.5:cloud',
                          'llama3.2:latest',
                          'llama3.1:8b',
                          'mistral:latest',
                          'gemma2:9b',
                          'qwen2.5:14b',
                          'deepseek-r1:8b',
                          'phi4:latest',
                        ].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </SettingsField>

                    {/* Toggle agents */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: 3,
                      background: agentsEnabled ? 'rgba(0,255,136,0.04)' : 'var(--bg3)',
                      border: `1px solid ${agentsEnabled ? 'rgba(0,255,136,0.2)' : 'var(--border)'}`,
                    }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                          Agents
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                          Active les agents autonomes dans le /cmd (staffing prédictif, alertes, etc.)
                        </div>
                      </div>
                      <button
                        onClick={() => setAgentsEnabled(v => !v)}
                        style={{
                          width: 44, height: 24, borderRadius: 12, border: 'none',
                          background: agentsEnabled ? 'var(--green)' : 'var(--border2)',
                          cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                          flexShrink: 0,
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 3,
                          left: agentsEnabled ? 23 : 3,
                          width: 18, height: 18, borderRadius: '50%',
                          background: '#000', transition: 'left 0.2s',
                        }} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* MCP Tools */}
            <section>
              <SectionLabel label="MCP_TOOLS" />
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 4, overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{
                  padding: '12px 20px', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                    Connecteurs MCP disponibles — gèrent les outils accessibles par l'AI
                  </div>
                  <span style={{
                    fontSize: 8, padding: '2px 8px', borderRadius: 2, letterSpacing: 1,
                    background: 'rgba(255,209,102,0.1)', color: 'var(--gold)',
                    border: '1px solid rgba(255,209,102,0.2)',
                  }}>
                    PLANNED
                  </span>
                </div>

                {/* Liste des outils planifiés */}
                {[
                  { icon: '🗄', name: 'Supabase MCP',    desc: 'Read/write company data via natural language',       status: 'active',   color: 'var(--green)' },
                  { icon: '📅', name: 'Calendar MCP',    desc: 'Sync leave requests to Google Calendar',             status: 'planned',  color: 'var(--text2)' },
                  { icon: '💬', name: 'Slack MCP',       desc: 'Notify managers on assignment & leave events',       status: 'planned',  color: 'var(--text2)' },
                  { icon: '📊', name: 'Spreadsheet MCP', desc: 'Export CRA and profitability data to Google Sheets', status: 'planned',  color: 'var(--text2)' },
                  { icon: '⚙',  name: 'Custom MCP',     desc: 'Connect your own MCP server via endpoint URL',       status: 'soon',     color: 'var(--cyan)' },
                ].map((tool, i) => (
                  <div key={tool.name} style={{
                    padding: '14px 20px',
                    borderBottom: i < 4 ? '1px solid var(--border)' : undefined,
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>
                      {tool.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                        {tool.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                        {tool.desc}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 8, padding: '2px 8px', borderRadius: 2, letterSpacing: 1,
                      fontWeight: 700, textTransform: 'uppercase',
                      color: tool.color,
                      border: `1px solid ${tool.color}40`,
                      background: `${tool.color}10`,
                    }}>
                      {tool.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Usage */}
            <section>
              <SectionLabel label="USAGE" />
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '20px 24px',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 1 }}>
                  // Historique des appels AI et consommation de tokens — coming soon
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Calls today',    value: '—', color: 'var(--cyan)' },
                    { label: 'Tokens used',    value: '—', color: 'var(--green)' },
                    { label: 'Last call',      value: '—', color: 'var(--text2)' },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      padding: '14px 16px', borderRadius: 3,
                      background: 'var(--bg3)', border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: stat.color, fontFamily: 'var(--font-mono)' }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <SaveBar
              dirty={aiDirty}
              saving={settingsSaving}
              onSave={handleSaveAI}
              onReset={handleResetAI}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB: SUPER ADMIN
        ══════════════════════════════════════════════════ */}
        {activeTab === 'superadmin' && superAccess && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Badge */}
            <div style={{
              padding: '8px 14px', borderRadius: 4,
              background: 'rgba(255,45,107,0.06)', border: '1px solid rgba(255,45,107,0.2)',
              fontSize: 10, color: 'var(--pink)', letterSpacing: 1,
            }}>
              ⬡ Super Admin — cross-tenant access
            </div>

            <SectionLabel label="TENANTS" />
            {/* TODO: liste tenants, stats, créer nouveau tenant */}
            <ComingSoon label="tenant_management" />

            <SectionLabel label="PLATFORM_STATS" />
            {/* TODO: coût infra, tokens AI consommés, nb users */}
            <ComingSoon label="platform_stats" />
          </div>
        )}

      </div>

      {/* ── Modal formulaire équipe ── */}
      {showForm && (
        <TeamForm
          initial={editTarget}
          managers={managers}
          companyId={user?.companyId ?? ''}
          onSave={handleRefresh}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
        />
      )}

      {/* ── Confirm suppression ── */}
      {confirmDel && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid rgba(255,45,107,0.3)',
            borderRadius: 6, padding: 28, width: 400, maxWidth: '90vw',
          }}>
            <div style={{ fontSize: 9, color: 'var(--pink)', letterSpacing: 3, marginBottom: 12 }}>
              // CONFIRM_DELETE
            </div>
            <div style={{ fontSize: 13, color: '#fff', marginBottom: 8 }}>
              Supprimer l'équipe "{confirmDel.name}" ?
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 24 }}>
              Les {confirmDel.members.length} membre{confirmDel.members.length !== 1 ? 's' : ''} seront désassignés. Cette action est irréversible.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDel(null)}
                style={{
                  fontSize: 11, padding: '8px 16px', borderRadius: 2,
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  fontSize: 11, padding: '8px 16px', borderRadius: 2,
                  background: 'var(--pink)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                }}
              >
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}