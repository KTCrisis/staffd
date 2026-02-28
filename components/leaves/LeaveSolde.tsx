import type { Consultant } from '@/types'
import { Avatar }           from '@/components/ui'

interface LeaveSoldeProps {
  consultants: Consultant[]
}

export function LeaveSolde({ consultants }: LeaveSoldeProps) {
  return (
    <div>
      {consultants.map(c => {
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
