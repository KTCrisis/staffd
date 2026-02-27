import type { AvatarColor } from '@/types'
import { AVATAR_CLASS } from '@/lib/utils'

interface AvatarProps {
  initials: string
  color: AvatarColor
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { width: 24, height: 24, fontSize: 9 },
  md: { width: 32, height: 32, fontSize: 11 },
  lg: { width: 40, height: 40, fontSize: 13 },
}

export function Avatar({ initials, color, size = 'md' }: AvatarProps) {
  const { width, height, fontSize } = SIZES[size]
  return (
    <div
      className={`avatar ${AVATAR_CLASS[color]}`}
      style={{ width, height, fontSize }}
    >
      {initials}
    </div>
  )
}
