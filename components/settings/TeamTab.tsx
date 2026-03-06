'use client'

// ══════════════════════════════════════════════════════════════
// components/settings/TeamTab.tsx
// Gestion des équipes : TeamCard, TeamForm, modaux, state
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Avatar }   from '@/components/ui/Avatar'
import {
  useTeams, useConsultants,
  createTeam, updateTeam, deleteTeam,
  addTeamMember, removeTeamMember,
} from '@/lib/data'
import type { Team } from '@/lib/data'
import { SectionLabel, Skeleton, RoleBadge } from './shared'

// ── RoleBadge couleurs avatar ─────────────────────────────────
const AVATAR_BG: Record<string, string> = {
  green:  'linear-gradient(135deg, #00ff88, #00cc6e)',
  pink:   'linear-gradient(135deg, #ff2d6b, #cc2255)',
  cyan:   'linear-gradient(135deg, #00e5ff, #00b8cc)',
  gold:   'linear-gradient(135deg, #ffd166, #cc9900)',
  purple: 'linear-gradient(135deg, #b388ff, #7c4dff)',
}

// ══════════════════════════════════════════════════════════════
// TEAM CARD
// ══════════════════════════════════════════════════════════════

function TeamCard({
  team, consultants, onEdit, onDelete, onAddMember, onRemoveMember,
}: {
  team:           Team
  consultants:    any[]
  onEdit:         (team: Team) => void
  onDelete:       (team: Team) => void
  onAddMember:    (teamId: string, consultantId: string) => void
  onRemoveMember: (consultantId: string, teamName: string, consultantName: string) => void
}) {
  const [showAddMember,      setShowAddMember]      = useState(false)
  const [selectedConsultantId, setSelectedConsultantId] = useState('')

  const memberIds = new Set(team.members.map(m => m.id))
  // On affiche uniquement les consultants sans équipe (UNIQUE consultant_id dans team_members)
  // c.role est le titre de poste — on ne filtre PAS dessus
  const available = consultants.filter(c =>
    !memberIds.has(c.id) &&   // pas déjà dans CETTE équipe
    !(c as any).teamId         // pas dans une autre équipe
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
      {/* Header */}
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
        <span style={{
          fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
          color: 'var(--gold)', minWidth: 60,
        }}>
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
        <div style={{
          fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
          color: 'var(--text2)', marginBottom: 10,
        }}>
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
                    onClick={() => onRemoveMember(member.id, team.name, member.name)}
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
                <option key={c.id} value={c.id}>{c.name} — {c.role}</option>
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
  initial, managers, companyId, onSave, onClose,
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
    setSaving(true); setError('')
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

  const inputStyle = {
    width: '100%', background: 'var(--bg3)',
    border: '1px solid var(--border2)',
    color: 'var(--text)', padding: '8px 12px', borderRadius: 2,
    fontSize: 12, fontFamily: 'inherit',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 6, padding: 28, width: 480, maxWidth: '90vw',
      }}>
        <div style={{ fontSize: 9, color: 'var(--cyan)', letterSpacing: 3, marginBottom: 20 }}>
          // {initial ? 'EDIT_TEAM' : 'NEW_TEAM'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)' }}>
              Nom de l'équipe *
            </label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Front-end, Data, DevOps…"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)' }}>
              Description
            </label>
            <input
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Description courte (optionnel)"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)' }}>
              Manager
            </label>
            <select
              value={managerId} onChange={e => setManagerId(e.target.value)}
              style={{ ...inputStyle, color: managerId ? 'var(--text)' : 'var(--text2)' }}
            >
              <option value="">— Aucun manager</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{ fontSize: 11, color: 'var(--pink)' }}>⚠ {error}</div>
          )}

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
              disabled={saving}
              style={{
                fontSize: 11, padding: '8px 20px', borderRadius: 2,
                background: 'var(--cyan)', color: '#000',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
              }}
            >
              {saving ? 'Enregistrement…' : initial ? 'Modifier' : "Créer l'équipe"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TEAM TAB (export principal)
// ══════════════════════════════════════════════════════════════

export function TeamTab({ companyId }: { companyId: string }) {
  const [refresh, setRefresh] = useState(0)
  const { data: teams,       loading: lT } = useTeams(refresh)
  const { data: consultants, loading: lC } = useConsultants(refresh)

  // IDs retirés optimistiquement — cleared au prochain re-fetch
  const [optimisticRemovedIds, setOptimisticRemovedIds] = useState<Set<string>>(new Set())

  const allConsultants = consultants ?? []

  // Applique l'optimistic override : on force teamId = undefined pour les IDs retirés
  const allConsultantsOptimistic = allConsultants.map(c =>
    optimisticRemovedIds.has(c.id) ? { ...c, teamId: undefined } : c
  )

  // Quand les vraies données arrivent, on vide l'override

  useEffect(() => {
    if (!lC && !lT) setOptimisticRemovedIds(new Set())
  }, [lC, lT])

  const managers = allConsultantsOptimistic.filter(c =>
    c.role?.toLowerCase().includes('manager') ||
    c.role?.toLowerCase().includes('lead') ||
    c.role?.toLowerCase().includes('directeur')
  )

  const teamCount  = (teams ?? []).length
  const unassigned = allConsultantsOptimistic.filter(c => !(c as any).teamId && (c.role !== 'admin')).length

  const handleRefresh = () => setRefresh(r => r + 1)

  // ── State modaux ──────────────────────────────────────────
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<Team | null>(null)

  const [confirmDel, setConfirmDel] = useState<Team | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const [confirmRemoveMember, setConfirmRemoveMember] = useState<{
    consultantId: string; teamName: string; consultantName: string
  } | null>(null)
  const [removingMember, setRemovingMember] = useState(false)

  // ── Handlers ──────────────────────────────────────────────
  const handleAddMember = async (teamId: string, consultantId: string) => {
    try {
      await addTeamMember(teamId, consultantId)
      handleRefresh()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleRemoveMember = (consultantId: string, teamName: string, consultantName: string) => {
    setConfirmRemoveMember({ consultantId, teamName, consultantName })
  }

  const doRemoveMember = async () => {
    if (!confirmRemoveMember) return
    setRemovingMember(true)
    // Optimistic : retire immédiatement le consultant des équipes côté UI
    setOptimisticRemovedIds(prev => new Set([...prev, confirmRemoveMember.consultantId]))
    setConfirmRemoveMember(null)
    try {
      await removeTeamMember(confirmRemoveMember.consultantId)
      handleRefresh()
    } catch (e: any) {
      // Rollback optimistic en cas d'erreur
      setOptimisticRemovedIds(prev => {
        const next = new Set(prev)
        next.delete(confirmRemoveMember.consultantId)
        return next
      })
      alert(e.message)
    } finally {
      setRemovingMember(false)
    }
  }

  const handleDeleteTeam = async () => {
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

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: 'Équipes',      value: teamCount,  color: 'var(--cyan)' },
            { label: 'Consultants',  value: allConsultants.filter(c => c.contractType !== 'freelance').length, color: 'var(--green)' },
            { label: 'Freelances',   value: allConsultants.filter(c => c.contractType === 'freelance').length, color: 'var(--gold)' },
            { label: 'Non assignés', value: unassigned, color: unassigned > 0 ? 'var(--pink)' : 'var(--text2)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>
                {s.value}
              </div>
              <div style={{
                fontSize: 9, color: 'var(--text2)', letterSpacing: 2,
                textTransform: 'uppercase', marginTop: 4,
              }}>
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
              <Skeleton h={120} /><Skeleton h={120} />
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
                  consultants={allConsultantsOptimistic}
                  onEdit={t => { setEditTarget(t); setShowForm(true) }}
                  onDelete={t => setConfirmDel(t)}
                  onAddMember={handleAddMember}
                  onRemoveMember={handleRemoveMember}
                />
              ))}
            </div>
          )}
        </section>

        {/* Non assignés */}
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
                {allConsultantsOptimistic
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

      {/* ── Modal formulaire équipe ── */}
      {showForm && (
        <TeamForm
          initial={editTarget}
          managers={managers}
          companyId={companyId}
          onSave={handleRefresh}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
        />
      )}

      {/* ── Confirm suppression équipe ── */}
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
                onClick={handleDeleteTeam}
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

      {/* ── Confirm retrait membre ── */}
      {confirmRemoveMember && (
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
              // CONFIRM_REMOVE_MEMBER
            </div>
            <div style={{ fontSize: 13, color: '#fff', marginBottom: 8 }}>
              Retirer "{confirmRemoveMember.consultantName}" ?
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 24 }}>
              Ce consultant sera retiré de l'équipe "{confirmRemoveMember.teamName}" et repassera en "sans équipe".
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmRemoveMember(null)}
                disabled={removingMember}
                style={{
                  fontSize: 11, padding: '8px 16px', borderRadius: 2,
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Annuler
              </button>
              <button
                onClick={doRemoveMember}
                disabled={removingMember}
                style={{
                  fontSize: 11, padding: '8px 16px', borderRadius: 2,
                  background: 'var(--pink)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                }}
              >
                {removingMember ? 'Retrait…' : 'Retirer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}