'use client'

import type { Consultant } from '@/types'
import { Avatar }      from '@/components/ui/Avatar'
import { Badge }       from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatDate }  from '@/lib/utils'

interface ConsultantTableProps {
  consultants: Consultant[]
  onSelect?: (consultant: Consultant) => void
}

export function ConsultantTable({ consultants, onSelect }: ConsultantTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Consultant</th>
            <th>Rôle</th>
            <th>Projet actuel</th>
            <th>Statut</th>
            <th>Disponible le</th>
            <th>CP restants</th>
            <th>Taux occup.</th>
          </tr>
        </thead>
        <tbody>
          {consultants.map(c => (
            <tr key={c.id} onClick={() => onSelect?.(c)}>

              {/* Consultant */}
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
                  <span className="td-primary">{c.name}</span>
                </div>
              </td>

              {/* Rôle */}
              <td>{c.role}</td>

              {/* Projet */}
              <td style={{ color: c.currentProject ? 'var(--cyan)' : 'var(--text2)' }}>
                {c.currentProject ?? '—'}
              </td>

              {/* Statut */}
              <td><Badge variant={c.status} /></td>

              {/* Disponible le */}
              <td style={{ color: 'var(--text2)' }}>
                {c.availableFrom ? formatDate(c.availableFrom) : 'Maintenant'}
              </td>

              {/* CP restants */}
              <td style={{ color: 'var(--text2)' }}>{c.leaveDaysLeft}j</td>

              {/* Taux occupation */}
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, minWidth: 36, fontSize: 11 }}>
                    {c.occupancyRate}%
                  </span>
                  <ProgressBar value={c.occupancyRate} style={{ flex: 1, minWidth: 80 }} />
                </div>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
