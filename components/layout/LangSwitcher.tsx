'use client'

import { useLocale }   from 'next-intl'
import { useRouter, usePathname } from '@/lib/navigation'

const LOCALES = [
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
]

export function LangSwitcher() {
  const locale   = useLocale()
  const router   = useRouter()
  const pathname = usePathname()

  const switchTo = (code: string) => {
  if (code === locale) return
  router.replace(pathname, { locale: code })
}

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {LOCALES.map(l => (
        <button
          key={l.code}
          onClick={() => switchTo(l.code)}
          className="btn btn-ghost btn-sm"
          style={{
            padding: '5px 8px',
            gap: 4,
            display: 'flex',
            alignItems: 'center',
            opacity: locale === l.code ? 1 : 0.5,
            borderColor: locale === l.code ? 'var(--green)' : 'var(--border)',
            color:        locale === l.code ? 'var(--green)' : 'var(--text2)',
          }}
          title={l.code === 'fr' ? 'Français' : 'English'}
        >
          <span>{l.flag}</span>
          <span style={{ fontSize: 9, letterSpacing: 1 }}>{l.label}</span>
        </button>
      ))}
    </div>
  )
}
