'use client'

// ══════════════════════════════════════════════════════════════
// components/settings/TeamTab.tsx
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react'
import { useTranslations }      from 'next-intl'
import { Avatar }               from '@/components/ui/Avatar'
import {
  useTeams, useConsultants,
  createTeam, updateTeam, deleteTeam,
  addTeamMember, removeTeamMember,
} from '@/lib/data'
import type { Team }            from '@/lib/data'
import { SectionLabel, Skeleton, RoleBadge } from './shared'

// ══════════════════════════════════════════════════════════════
// TEAM CARD
// ══════════════════════════════════════════════════════════════

function TeamCard({
  team, consultants, allTeamMemberIds, onEdit, onDelete, onAddMember, onRemoveMember,
}: {
  team:             Team
  consultants:      any[]
  /** Set de tous les ids déjà dans une équipe (optimiste inclus) — source de vérité unique */
  allTeamMemberIds: Set<string>
  onEdit:           (team: Team) => void
  onDelete:         (team: Team) => void
  onAddMember:      (teamId: string, consultantId: string) => void
  onRemoveMember:   (consultantId: string, teamName: string, consultantName: string) => void
}) {
  const t = useTranslations('settings.team.card')
  const [showAddMember,        setShowAddMember]        = useState(false)
  const [selectedConsultantId, setSelectedConsultantId] = useState('')

  // Membres visibles = ceux dont l'id est encore dans allTeamMemberIds pour cette équipe
  const visibleMembers = team.members.filter(m => allTeamMemberIds.has(m.id))

  // Disponibles = consultants qui ne sont dans AUCUNE équipe
  const available = consultants.filter(c => !allTeamMemberIds.has(c.id))

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
          }}>◈</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{team.name}</div>
            {team.description && (
              <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{team.description}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text2)' }}>
            {t('memberCount', { count: team.members.length })}
          </span>
          <button
            onClick={() => onEdit(team)}
            style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 2,
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{t('edit')}</button>
          <button
            onClick={() => onDelete(team)}
            style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 2,
              background: 'none', border: '1px solid rgba(255,45,107,0.3)',
              color: 'var(--pink)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{t('delete')}</button>
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
          {t('managerLabel')}
        </span>
        {team.managerId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar initials={team.managerInitials ?? '??'} color={(team.managerAvatarColor ?? 'green') as any} size="sm" />
            <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{team.managerName}</span>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic' }}>
            {t('noManager')}
          </span>
        )}
      </div>

      {/* Membres */}
      <div style={{ padding: '12px 20px' }}>
        <div style={{
          fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
          color: 'var(--text2)', marginBottom: 10,
        }}>
          {t('membersLabel')}
        </div>

        {visibleMembers.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic', marginBottom: 10 }}>
            {t('emptyMembers')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {visibleMembers.map(member => (
              <div key={member.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: 3,
                background: 'var(--bg3)', border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar initials={member.initials} color={(member.avatar_color ?? 'green') as any} size="sm" />
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{member.name}</div>
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
                  >{t('remove')}</button>
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
              <option value="">{t('selectConsultant')}</option>
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
            >{t('add')}</button>
            <button
              onClick={() => { setShowAddMember(false); setSelectedConsultantId('') }}
              style={{
                fontSize: 10, padding: '6px 10px', borderRadius: 2,
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{t('cancel')}</button>
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
            <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> {t('addMember')}
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
  const t = useTranslations('settings.team.form')
  const [name,        setName]        = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [managerId,   setManagerId]   = useState(initial?.managerId ?? '')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError(t('errorName')); return }
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
          // {initial ? t('titleEdit') : t('titleNew')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)' }}>
              {t('nameLabel')}
            </label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)' }}>
              {t('descLabel')}
            </label>
            <input
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder={t('descPlaceholder')}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)' }}>
              {t('managerLabel')}
            </label>
            <select
              value={managerId} onChange={e => setManagerId(e.target.value)}
              style={{ ...inputStyle, color: managerId ? 'var(--text)' : 'var(--text2)' }}
            >
              <option value="">{t('noManager')}</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
              ))}
            </select>
          </div>

          {error && <div style={{ fontSize: 11, color: 'var(--pink)' }}>⚠ {error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={onClose}
              style={{
                fontSize: 11, padding: '8px 16px', borderRadius: 2,
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{t('cancel')}</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                fontSize: 11, padding: '8px 20px', borderRadius: 2,
                background: 'var(--cyan)', color: '#000',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
              }}
            >
              {saving ? t('saving') : initial ? t('save') : t('create')}
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
  const t = useTranslations('settings.team')
  const [refresh, setRefresh] = useState(0)
  const { data: teams,       loading: lT } = useTeams(refresh)
  const { data: consultants, loading: lC } = useConsultants(refresh)

  // IDs retirés de façon optimiste — avant que le refresh DB ne revienne
  const [optimisticRemovedIds, setOptimisticRemovedIds] = useState<Set<string>>(new Set())
  // IDs ajoutés de façon optimiste
  const [optimisticAddedMap,   setOptimisticAddedMap]   = useState<Map<string, string>>(new Map()) // consultantId → teamId

  // ── Source de vérité unique : qui est dans quelle équipe ──────
  // On part des données DB (teams[].members) et on applique les mutations optimistes.
  // On n'utilise PAS c.teamId (champ du consultant) car il peut être stale après un remove.
  const allTeamMemberIds = useMemo(() => {
    const ids = new Set<string>()
    for (const team of teams ?? []) {
      for (const m of team.members) {
        if (!optimisticRemovedIds.has(m.id)) ids.add(m.id)
      }
    }
    // Ajouts optimistes
    for (const [cId] of optimisticAddedMap) ids.add(cId)
    return ids
  }, [teams, optimisticRemovedIds, optimisticAddedMap])

  // Réinitialise les sets optimistes une fois le refresh terminé
  useEffect(() => {
    if (!lC && !lT) {
      setOptimisticRemovedIds(new Set())
      setOptimisticAddedMap(new Map())
    }
  }, [lC, lT])

  const allConsultants = consultants ?? []

  const managers = allConsultants.filter(c =>
    c.role?.toLowerCase().includes('manager') ||
    c.role?.toLowerCase().includes('lead') ||
    c.role?.toLowerCase().includes('directeur')
  )

  const teamCount  = (teams ?? []).length
  const unassigned = allConsultants.filter(c => !allTeamMemberIds.has(c.id)).length

  const handleRefresh = () => setRefresh(r => r + 1)

  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<Team | null>(null)

  const [confirmDel, setConfirmDel] = useState<Team | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const [confirmRemoveMember, setConfirmRemoveMember] = useState<{
    consultantId: string; teamName: string; consultantName: string
  } | null>(null)
  const [removingMember, setRemovingMember] = useState(false)

  const handleAddMember = async (teamId: string, consultantId: string) => {
    // Optimiste : marque le consultant comme assigné immédiatement
    setOptimisticAddedMap(prev => new Map([...prev, [consultantId, teamId]]))
    try {
      await addTeamMember(teamId, consultantId)
      handleRefresh()
    } catch (e: any) {
      setOptimisticAddedMap(prev => {
        const next = new Map(prev)
        next.delete(consultantId)
        return next
      })
      alert(e.message)
    }
  }

  const handleRemoveMember = (consultantId: string, teamName: string, consultantName: string) => {
    setConfirmRemoveMember({ consultantId, teamName, consultantName })
  }

  const doRemoveMember = async () => {
    if (!confirmRemoveMember) return
    setRemovingMember(true)
    setOptimisticRemovedIds(prev => new Set([...prev, confirmRemoveMember.consultantId]))
    setConfirmRemoveMember(null)
    try {
      await removeTeamMember(confirmRemoveMember.consultantId)
      handleRefresh()
    } catch (e: any) {
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

  const tDel = useTranslations('settings.team.confirmDelete')
  const tRem = useTranslations('settings.team.confirmRemove')

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { labelKey: 'statsTeams',       value: teamCount,  color: 'var(--cyan)' },
            { labelKey: 'statsConsultants', value: allConsultants.filter(c => c.contractType !== 'freelance').length, color: 'var(--green)' },
            { labelKey: 'statsFreelances',  value: allConsultants.filter(c => c.contractType === 'freelance').length, color: 'var(--gold)' },
            { labelKey: 'statsUnassigned',  value: unassigned, color: unassigned > 0 ? 'var(--pink)' : 'var(--text2)' },
          ].map(s => (
            <div key={s.labelKey} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                {t(s.labelKey as any)}
              </div>
            </div>
          ))}
        </div>

        {/* Équipes */}
        <section>
          <SectionLabel label={t('section')} />
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
              <div style={{ marginBottom: 8 }}>{t('emptyTitle')}</div>
              <div style={{ fontSize: 10, marginBottom: 20 }}>{t('emptySubtitle')}</div>
              <button
                onClick={() => { setEditTarget(null); setShowForm(true) }}
                style={{
                  fontSize: 11, padding: '8px 20px', borderRadius: 2,
                  background: 'var(--cyan)', color: '#000',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                }}
              >{t('createFirst')}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(teams ?? []).map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  consultants={allConsultants}
                  allTeamMemberIds={allTeamMemberIds}
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
            <SectionLabel label={t('unassignedSection')} />
            <div style={{
              background: 'var(--bg2)', border: '1px solid rgba(255,209,102,0.2)',
              borderRadius: 4, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 12 }}>
                {t('unassignedWarning', { count: unassigned })}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allConsultants
                  .filter(c => !allTeamMemberIds.has(c.id))
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
              // {tDel('header')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>
              {tDel('title', { name: confirmDel.name })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 24 }}>
              {tDel('body', { count: confirmDel.members.length })}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDel(null)}
                style={{
                  fontSize: 11, padding: '8px 16px', borderRadius: 2,
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >{tDel('cancel')}</button>
              <button
                onClick={handleDeleteTeam}
                disabled={deleting}
                style={{
                  fontSize: 11, padding: '8px 16px', borderRadius: 2,
                  background: 'var(--pink)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                }}
              >{deleting ? tDel('deleting') : tDel('confirm')}</button>
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
              // {tRem('header')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>
              {tRem('title', { consultant: confirmRemoveMember.consultantName })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 24 }}>
              {tRem('body', { team: confirmRemoveMember.teamName })}
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
              >{tRem('cancel')}</button>
              <button
                onClick={doRemoveMember}
                disabled={removingMember}
                style={{
                  fontSize: 11, padding: '8px 16px', borderRadius: 2,
                  background: 'var(--pink)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                }}
              >{removingMember ? tRem('removing') : tRem('confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}