'use client'

import { useState, useEffect } from 'react'
import { useTranslations }  from 'next-intl'
import { useAuthContext }   from '@/components/layout/AuthProvider'
import { isAdmin }          from '@/lib/auth'
import { useRouter }        from '@/lib/navigation'
import { Topbar }           from '@/components/layout/Topbar'
import { Avatar }           from '@/components/ui/Avatar'
import {
  useTeams, useConsultants,
  createTeam, updateTeam, deleteTeam,
  addTeamMember, removeTeamMember,
} from '@/lib/data'
import type { Team, TeamMember } from '@/lib/data'

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
// PAGE SETTINGS
// ══════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const { user } = useAuthContext()
  const router      = useRouter()
  const adminAccess = isAdmin(user?.role)

  useEffect(() => {
    if (user && !adminAccess) {
      router.push('/dashboard' as never)
    }
  }, [user, adminAccess, router])

  if (!user || !adminAccess) return null

  const [refresh,    setRefresh]    = useState(0)
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<Team | null>(null)
  const [confirmDel, setConfirmDel] = useState<Team | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const { data: teams,       loading: lT } = useTeams(refresh)
  const { data: consultants, loading: lC } = useConsultants(refresh)

  const allConsultants = consultants ?? []

  // Liste des managers (rôle manager dans app_metadata)
  // Note : on filtre sur le champ role du profil consultant
  // qui reflète le métier (pas forcément le user_role Auth)
  // Pour les managers Auth, on se base sur ceux qui ont le rôle consultant
  // avec role = 'manager' dans le profil. Ajuster selon ton modèle.
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

  const teamCount       = (teams ?? []).length
  const unassigned      = allConsultants.filter(c => !(c as any).teamId && (c.role !== 'admin')).length

  return (
    <>
      <Topbar
        title="Settings"
        breadcrumb="Admin / Settings"
        ctaLabel="Nouvelle équipe"
        onCta={() => { setEditTarget(null); setShowForm(true) }}
      />

      <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: 'Équipes',             value: teamCount,   color: 'var(--cyan)' },
            { label: 'Consultants',         value: allConsultants.filter(c => c.contractType !== 'freelance').length, color: 'var(--green)' },
            { label: 'Freelances',          value: allConsultants.filter(c => c.contractType === 'freelance').length, color: 'var(--gold)' },
            { label: 'Non assignés',        value: unassigned,  color: unassigned > 0 ? 'var(--pink)' : 'var(--text2)' },
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

        {/* ── Section équipes ── */}
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

        {/* ── Consultants non assignés ── */}
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

      {/* ── Modal formulaire ── */}
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