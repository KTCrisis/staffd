'use client'

import { useTranslations }  from 'next-intl'
import type { Consultant }  from '@/types'
import { Avatar }           from '@/components/ui/Avatar'
import { Badge }            from '@/components/ui/Badge'
import { ProgressBar }      from '@/components/ui/ProgressBar'
import { formatDate }       from '@/lib/utils'

interface ConsultantTableProps {
  consultants: Consultant[]
  onSelect?:   (consultant: Consultant) => void
}

export function ConsultantTable({ consultants, onSelect }: ConsultantTableProps) {
  const t = useTranslations('consultants')

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('table.name')}</th>
            <th>{t('table.role')}</th>
            <th>{t('table.project')}</th>
            <th>{t('table.status')}</th>
            <th>{t('table.available')}</th>
            <th>{t('table.leaveDays')}</th>
            <th>{t('table.occupancy')}</th>
          </tr>
        </thead>
        <tbody>
          {consultants.map(c => (
            <tr key={c.id} onClick={() => onSelect?.(c)}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
                  <span className="td-primary">{c.name}</span>
                </div>
              </td>
              <td>{c.role}</td>
              <td style={{ color: c.currentProject ? 'var(--cyan)' : 'var(--text2)' }}>
                {c.currentProject ?? '—'}
              </td>
              <td><Badge variant={c.status} /></td>
              <td style={{ color: 'var(--text2)' }}>
                {c.availableFrom ? formatDate(c.availableFrom) : t('now')}
              </td>
              <td style={{ color: 'var(--text2)' }}>{c.leaveDaysLeft}j</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, minWidth: 36, fontSize: 11 }}>{c.occupancyRate}%</span>
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
