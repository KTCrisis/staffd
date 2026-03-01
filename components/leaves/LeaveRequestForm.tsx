'use client'

import { useState }        from 'react'
import { useTranslations } from 'next-intl'
import { useAuthContext }  from '@/components/layout/AuthProvider'
import { createLeaveRequest } from '@/lib/data'
import { supabase }        from '@/lib/supabase'

const LEAVE_TYPES = ['CP', 'RTT', 'Sans solde'] as const
type LeaveType = typeof LEAVE_TYPES[number]

interface Props {
  onClose: () => void
  onSaved: () => void
}

// Calcule les jours ouvrés entre deux dates (exclut samedis et dimanches)
function countWorkingDays(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (e < s) return 0
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export function LeaveRequestForm({ onClose, onSaved }: Props) {
  const t       = useTranslations('conges')
  const { user } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    type:       'CP' as LeaveType,
    start_date: '',
    end_date:   '',
  })

  const days = countWorkingDays(form.start_date, form.end_date)
  const set  = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.start_date || !form.end_date) {
      setError('Please select start and end dates')
      return
    }
    if (form.end_date < form.start_date) {
      setError('End date must be after start date')
      return
    }
    if (days === 0) {
      setError('No working days in selected range')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Récupérer le consultant_id lié au user connecté
      const { data: consultant, error: cErr } = await supabase
        .from('consultants')
        .select('id, company_id, leave_days_total, leave_days_taken')
        .eq('user_id', user!.id)
        .single()

      if (cErr || !consultant) {
        setError('No consultant profile linked to your account')
        return
      }

      const remaining = consultant.leave_days_total - consultant.leave_days_taken
      if (form.type === 'CP' && days > remaining) {
        setError(`Not enough days left (${remaining} remaining)`)
        return
      }

      await createLeaveRequest({
        consultant_id: consultant.id,
        company_id:    consultant.company_id,
        type:          form.type,
        start_date:    form.start_date,
        end_date:      form.end_date,
        days,
      })

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
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)', zIndex: 199,
      }} />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
        background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: 28, overflowY: 'auto',
        boxShadow: '-4px 0 20px var(--shadow)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
            // new time-off request
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Type */}
          <Field label="Type">
            <div style={{ display: 'flex', gap: 8 }}>
              {LEAVE_TYPES.map(type => (
                <button
                  key={type}
                  className={`btn btn-sm ${form.type === type ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => set('type', type)}
                >
                  {t(`types.${type}`)}
                </button>
              ))}
            </div>
          </Field>

          {/* Dates */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Start date" style={{ flex: 1 }}>
              <input
                type="date"
                className="search-input"
                style={{ width: '100%' }}
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
            </Field>
            <Field label="End date" style={{ flex: 1 }}>
              <input
                type="date"
                className="search-input"
                style={{ width: '100%' }}
                value={form.end_date}
                min={form.start_date}
                onChange={e => set('end_date', e.target.value)}
              />
            </Field>
          </div>

          {/* Jours calculés */}
          {days > 0 && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--bg3)',
              borderRadius: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>Working days</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--cyan)' }}>{days}j</span>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div style={{
              fontSize: 11, color: 'var(--pink)',
              padding: '8px 12px',
              background: 'rgba(255,45,107,0.08)',
              borderRadius: 4,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleSubmit}
              disabled={loading || days === 0}
            >
              {loading ? '...' : '✓ Submit request'}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>

        </div>
      </div>
    </>
  )
}

function Field({ label, children, style }: {
  label: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={style}>
      <div style={{
        fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
        color: 'var(--text2)', marginBottom: 6,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}