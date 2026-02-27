'use client'

import type { Consultant } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Badge }  from '@/components/ui/Badge'

interface ConsultantItemProps {
  consultant: Consultant
  onClick?: () => void
}

export function ConsultantItem({ consultant, onClick }: ConsultantItemProps) {
  return (
    <div className="consultant-item" onClick={onClick}>
      <Avatar
        initials={consultant.initials}
        color={consultant.avatarColor}
        size="md"
      />
      <div style={{ flex: 1 }}>
        <div className="c-name">{consultant.name}</div>
        <div className="c-role">{consultant.role}</div>
      </div>
      <Badge variant={consultant.status} />
    </div>
  )
}
