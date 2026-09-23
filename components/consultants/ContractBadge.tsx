'use client'

import { useTranslations } from 'next-intl'
import { alpha }           from '@/lib/utils'

/**
 * Contract badge shared by the consultants list, drawer, detail and
 * profitability pages. A non-billable function (dirigeant, commercial,
 * support) wins, then `founder`; both only change the label: costs keep
 * following contract_type.
 */
export function ContractBadge({ type, founder = false, fonction, compact = false }: {
  type:      string
  founder?:  boolean
  fonction?: string | null
  compact?:  boolean
}) {
  const t = useTranslations('consultants')
  const nonBillable = !!fonction && fonction !== 'consultant'
  const tone  = nonBillable ? 'var(--gold)' : founder ? 'var(--green)' : type === 'freelance' ? 'var(--cyan)' : null
  const label = nonBillable ? t(`fonction.${fonction}`)
    : founder ? t('contractType.founder')
    : type === 'freelance' ? t('contractType.freelance') : t('contractType.employee')

  return (
    <span
      className={compact ? undefined : 'cons-contract-badge'}
      style={{
        ...(compact && {
          fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const,
          padding: '1px 5px', borderRadius: 2,
        }),
        background: tone ? alpha(tone, 10) : 'rgba(255,255,255,0.06)',
        border:     `1px solid ${tone ? alpha(tone, 30) : 'var(--border)'}`,
        color:      tone ?? 'var(--text2)',
      }}
    >
      {label}
    </span>
  )
}
