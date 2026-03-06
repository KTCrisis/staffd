'use client'

import { useTranslations } from 'next-intl'
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
  const t = useTranslations('conges')

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
        const isFreelance = c.contractType === 'freelance'
        const cpColor     = c.leaveDaysLeft >= 15 ? 'var(--green)' : c.leaveDaysLeft >= 7 ? 'var(--gold)' : 'var(--pink)'
        const rttColor    = (c.rttLeft ?? 0) >= 5 ? 'var(--cyan)' : (c.rttLeft ?? 0) >= 2 ? 'var(--gold)' : 'var(--pink)'
        const hasRtt      = !isFreelance && c.rttTotal != null && c.rttTotal > 0

        return (
          <div key={c.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="c-name">{c.name}</div>
                  {isFreelance && (
                    <span style={{
                      fontSize: 8, fontWeight: 700, letterSpacing: 1,
                      padding: '1px 5px', borderRadius: 2, textTransform: 'uppercase',
                      background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)',
                      color: 'var(--cyan)',
                    }}>
                      Freelance
                    </span>
                  )}
                </div>
                <div className="c-role">{c.role}</div>
              </div>
            </div>

            <div style={{ paddingLeft: 36 }}>
              {isFreelance ? (
                <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text2)', fontStyle: 'italic', opacity: 0.7 }}>
                  {t('soldes.freelanceNote')}
                </div>
              ) : (
                <>
                  <SoldeRow
                    label={t('types.CP')}
                    left={c.leaveDaysLeft}
                    total={c.leaveDaysTotal ?? 25}
                    color={cpColor}
                  />
                  {hasRtt && (
                    <SoldeRow
                      label={t('types.RTT')}
                      left={c.rttLeft ?? 0}
                      total={c.rttTotal ?? 0}
                      color={rttColor}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}