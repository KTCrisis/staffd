import type { Consultant } from '@/types'
import { Avatar }          from '@/components/ui'

interface LeaveSoldeProps {
  consultants:    Consultant[]
  currentUserId?: string
  isConsultant?:  boolean
}

function BalanceBar({ taken, total, color }: { taken: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0
  return (
    <div style={{ marginTop: 3, height: 3, background: 'var(--bg3)', borderRadius: 2 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
    </div>
  )
}

function SoldeRow({ label, left, total, color }: { label: string; left: number; total: number; color: string }) {
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {left}j
          <span style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 400, marginLeft: 3 }}>/ {total}j</span>
        </span>
      </div>
      <BalanceBar taken={total - left} total={total} color={color} />
    </div>
  )
}

export function LeaveSolde({ consultants, currentUserId, isConsultant }: LeaveSoldeProps) {
  const visible = isConsultant && currentUserId
    ? consultants.filter(c => c.user_id === currentUserId)
    : consultants

  return (
    <div>
      {visible.length === 0 && (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
          // no profile linked
        </div>
      )}

      {visible.map(c => {
        const cpColor  = c.leaveDaysLeft >= 15 ? 'var(--green)' : c.leaveDaysLeft >= 7 ? 'var(--gold)' : 'var(--pink)'
        const rttColor = (c.rttLeft ?? 0) >= 5 ? 'var(--cyan)' : (c.rttLeft ?? 0) >= 2 ? 'var(--gold)' : 'var(--pink)'
        const hasRtt   = c.rttTotal != null && c.rttTotal > 0

        return (
          <div key={c.id} style={{
            padding: '12px 0',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
              <div style={{ flex: 1 }}>
                <div className="c-name">{c.name}</div>
                <div className="c-role">{c.role}</div>
              </div>
            </div>

            <div style={{ paddingLeft: 36 }}>
              <SoldeRow
                label="CP"
                left={c.leaveDaysLeft}
                total={c.leaveDaysTotal ?? 25}
                color={cpColor}
              />
              {hasRtt && (
                <SoldeRow
                  label="RTT"
                  left={c.rttLeft ?? 0}
                  total={c.rttTotal ?? 0}
                  color={rttColor}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}