'use client'

import type { LeaveRequest } from '@/types'
import { Badge }             from '@/components/ui'
import { useTranslations }   from 'next-intl'

interface LeaveRequestCardProps {
  request:    LeaveRequest
  onApprove?: (id: string) => void
  onRefuse?:  (id: string) => void
}

export function LeaveRequestCard({ request, onApprove, onRefuse }: LeaveRequestCardProps) {
  const t       = useTranslations('conges')
  const tCommon = useTranslations('common')
  const start   = new Date(request.startDate).toLocaleDateString()
  const end     = new Date(request.endDate).toLocaleDateString()

  return (
    <div className="conge-card">
      <div className="conge-header">
        <div>
          <div className="conge-name">{request.consultantName}</div>
          <div className="conge-meta">
            {t(`types.${request.type}`)} · {start} — {end} ·{' '}
            <strong>{request.days} {request.days > 1 ? tCommon('days') : tCommon('day')}</strong>
          </div>
        </div>

        {/* Boutons approve/refuse — admin/manager uniquement */}
        {request.status === 'pending' && onApprove && onRefuse && (
          <div className="conge-actions">
            <button className="btn btn-primary btn-sm" onClick={() => onApprove(request.id)}>
              {t('approve')}
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => onRefuse(request.id)}>
              {t('refuse')}
            </button>
          </div>
        )}

        {/* Badge statut — consultant ou demande non-pending */}
        {(request.status !== 'pending' || !onApprove) && (
          <Badge variant={request.status} />
        )}
      </div>

      {request.impactWarning && (
        <div className="conge-impact">⚠ {request.impactWarning}</div>
      )}
    </div>
  )
}