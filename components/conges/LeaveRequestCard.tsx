'use client'

import type { LeaveRequest } from '@/types'
import { Badge, Button }     from '@/components/ui'

interface LeaveRequestCardProps {
  request: LeaveRequest
  onApprove?: (id: string) => void
  onRefuse?:  (id: string) => void
}

const TYPE_LABELS = { CP: 'Congé payé', RTT: 'RTT', 'Sans solde': 'Sans solde' }

export function LeaveRequestCard({ request, onApprove, onRefuse }: LeaveRequestCardProps) {
  const start = new Date(request.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const end   = new Date(request.endDate).toLocaleDateString('fr-FR',   { day: 'numeric', month: 'short' })

  return (
    <div className="conge-card">
      <div className="conge-header">
        <div>
          <div className="conge-name">{request.consultantName}</div>
          <div className="conge-meta">
            {TYPE_LABELS[request.type]} · {start} — {end} ·{' '}
            <strong>{request.days} jour{request.days > 1 ? 's' : ''}</strong>
          </div>
        </div>

        {request.status === 'pending' && (
          <div className="conge-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onApprove?.(request.id)}
            >
              ✓ Valider
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => onRefuse?.(request.id)}
            >
              ✗
            </button>
          </div>
        )}

        {request.status !== 'pending' && (
          <Badge variant={request.status} />
        )}
      </div>

      {request.impactWarning && (
        <div className="conge-impact">⚠ {request.impactWarning}</div>
      )}
    </div>
  )
}
