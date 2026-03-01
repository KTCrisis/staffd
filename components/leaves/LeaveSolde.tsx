import type { Consultant } from '@/types'
import { Avatar }           from '@/components/ui'

interface LeaveSoldeProps {
  consultants:    Consultant[]
  currentUserId?: string
  isConsultant?:  boolean
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
        const color =
          c.leaveDaysLeft >= 15 ? 'var(--green)' :
          c.leaveDaysLeft >= 7  ? 'var(--gold)'  :
          'var(--pink)'

        return (
          <div key={c.id} className="consultant-item">
            <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
            <div style={{ flex: 1 }}>
              <div className="c-name">{c.name}</div>
              <div className="c-role">{c.role}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color }}>{c.leaveDaysLeft}j</div>
              <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 1 }}>CP restants</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}