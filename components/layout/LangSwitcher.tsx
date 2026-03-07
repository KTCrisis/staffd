'use client'

import { useLocale }              from 'next-intl'
import { useRouter, usePathname } from '@/lib/navigation'

const LOCALES = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
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
    <div style={{ display: 'flex', gap: 2 }}>
      {LOCALES.map((l, i) => (
        <button
          key={l.code}
          onClick={() => switchTo(l.code)}
          className="btn btn-ghost btn-sm"
          style={{
            padding:     '5px 9px',
            fontSize:    9,
            letterSpacing: 1.5,
            fontWeight:  700,
            opacity:     locale === l.code ? 1 : 0.45,
            borderColor: locale === l.code ? 'var(--green)' : 'transparent',
            color:       locale === l.code ? 'var(--green)' : 'var(--text2)',
            borderRight: i < LOCALES.length - 1 ? '1px solid var(--border)' : undefined,
            borderRadius: 0,
          }}
          title={l.code === 'fr' ? 'Français' : 'English'}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}