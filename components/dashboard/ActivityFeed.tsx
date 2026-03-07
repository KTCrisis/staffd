'use client'

import { useTranslations } from 'next-intl'
import type { ActivityItem } from '@/types'

const DOT_COLOR: Record<ActivityItem['type'], string> = {
  leave:      'var(--pink)',
  assignment: 'var(--cyan)',
  milestone:  'var(--green)',
  alert:      'var(--gold)',
}

interface ActivityFeedProps {
  items?: ActivityItem[]
}

export function ActivityFeed({ items = [] }: ActivityFeedProps) {
  const t = useTranslations('activity')

  function formatTime(raw: string | undefined): string {
    if (!raw) return ''
    if (!raw.includes('T') && !raw.includes('-')) return raw

    try {
      const date    = new Date(raw)
      const now     = new Date()
      const diffMs  = now.getTime() - date.getTime()
      const diffMin = Math.floor(diffMs / 60000)
      const diffH   = Math.floor(diffMin / 60)
      const diffD   = Math.floor(diffH / 24)

      if (diffMin < 1)  return t('justNow')
      if (diffMin < 60) return t('minutesAgo', { count: diffMin })
      if (diffH < 24)   return t('hoursAgo',   { count: diffH })
      if (diffD === 1)  return t('yesterday', {
        time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      })
      return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    } catch {
      return raw
    }
  }

  if (items.length === 0) {
    return (
      <div style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic', padding: '8px 0' }}>
        {t('empty')}
      </div>
    )
  }

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
            {/* Supporte item.time (camelCase legacy) ET item.created_at (Supabase snake_case) */}
            <div className="notif-time">{formatTime((item as any).time ?? (item as any).created_at)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}