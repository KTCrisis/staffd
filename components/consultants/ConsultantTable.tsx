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

function ContractBadge({ type }: { type: 'employee' | 'freelance' }) {
  const isFreelance = type === 'freelance'
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
      padding: '1px 5px', borderRadius: 2,
      background: isFreelance ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.06)',
      border:     isFreelance ? '1px solid rgba(0,229,255,0.3)' : '1px solid var(--border)',
      color:      isFreelance ? 'var(--cyan)' : 'var(--text2)',
    }}>
      {isFreelance ? 'Freelance' : 'Salarié'}
    </span>
  )
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
          {consultants.map(c => {
            const isFreelance = c.contractType === 'freelance'
            return (
              <tr key={c.id} onClick={() => onSelect?.(c)}>

                {/* Nom + badge contrat */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span className="td-primary">{c.name}</span>
                      {c.contractType && <ContractBadge type={c.contractType} />}
                    </div>
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

                {/* CP restants — masqué pour freelance */}
                <td style={{ color: 'var(--text2)' }}>
                  {isFreelance
                    ? <span style={{ opacity: 0.35, fontSize: 10 }}>—</span>
                    : `${c.leaveDaysLeft}j`
                  }
                </td>

                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, minWidth: 36, fontSize: 11 }}>{c.occupancyRate}%</span>
                    <ProgressBar value={c.occupancyRate} style={{ flex: 1, minWidth: 80 }} />
                  </div>
                </td>

              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}