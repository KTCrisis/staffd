'use client'

import type { ActivityItem } from '@/types'

const DOT_COLOR: Record<ActivityItem['type'], string> = {
  leave:      'var(--pink)',
  assignment: 'var(--cyan)',
  milestone:  'var(--green)',
  alert:      'var(--gold)',
}

interface ActivityFeedProps {
  items: ActivityItem[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div>
      {items.map(item => (
        <div key={item.id} className={`notif-item ${!item.read ? 'notif-unread' : ''}`}>
          <div className="notif-dot" style={{ background: DOT_COLOR[item.type] }} />
          <div>
            <div
              className="notif-text"
              dangerouslySetInnerHTML={{ __html: item.message }}
            />
            <div className="notif-time">{item.time}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
