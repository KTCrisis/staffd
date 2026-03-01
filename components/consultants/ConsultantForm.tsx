'use client'

import { useState, useEffect }       from 'react'
import { useAuthContext }             from '@/components/layout/AuthProvider'
import { createConsultant, updateConsultant } from '@/lib/data'
import type { Consultant }            from '@/types'

const COLORS   = ['green', 'cyan', 'pink', 'gold', 'purple']
const STATUSES = ['available', 'assigned', 'partial', 'leave']

interface Props {
  consultant?: Consultant
  onClose: () => void
  onSaved: () => void
}

export function ConsultantForm({ consultant, onClose, onSaved }: Props) {
  const { user } = useAuthContext()  // ← pour récupérer companyId
  const isEdit   = !!consultant

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    name:             '',
    initials:         '',
    email:            '',
    role:             '',
    avatar_color:     'green',
    stack:            '',
    status:           'available',
    tjm:              '',
    leave_days_total: '25',
  })

  useEffect(() => {
    if (consultant) {
      setForm({
        name:             consultant.name,
        initials:         consultant.initials,
        email:            consultant.email ?? '',
        role:             consultant.role,
        avatar_color:     consultant.avatarColor,
        stack:            consultant.stack?.join(', ') ?? '',
        status:           consultant.status,
        tjm:              consultant.tjm?.toString() ?? '',
        leave_days_total: consultant.leaveDaysTotal?.toString() ?? '25',
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

  const handleSubmit = async () => {
    if (!form.name || !form.role) { setError('Name and role are required'); return }
    setLoading(true)
    setError(null)
    try {
      const payload = {
        name:             form.name.trim(),
        initials:         form.initials.trim(),
        email:            form.email.trim() || undefined,
        role:             form.role.trim(),
        avatar_color:     form.avatar_color,
        stack:            form.stack ? form.stack.split(',').map(s => s.trim()).filter(Boolean) : [],
        status:           form.status as any,
        tjm:              form.tjm ? parseFloat(form.tjm) : undefined,
        leave_days_total: parseInt(form.leave_days_total) || 25,
      }

      if (isEdit) {
        await updateConsultant(consultant!.id, payload)
      } else {
        // ← injecter company_id à la création uniquement
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
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
        background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: 28, overflowY: 'auto',
        boxShadow: '-4px 0 20px var(--shadow)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
            {isEdit ? '// edit consultant' : '// new consultant'}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

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

          <Field label="Stack (comma-separated)">
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

          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Daily rate (€)" style={{ flex: 1 }}>
              <input className="search-input" style={{ width: '100%' }} placeholder="650" type="number"
                value={form.tjm} onChange={e => set('tjm', e.target.value)} />
            </Field>
            <Field label="Leave days / year" style={{ flex: 1 }}>
              <input className="search-input" style={{ width: '100%' }} type="number"
                value={form.leave_days_total} onChange={e => set('leave_days_total', e.target.value)} />
            </Field>
          </div>

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