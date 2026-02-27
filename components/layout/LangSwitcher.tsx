'use client'

import { useLocale }   from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'

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

    // Remplace le préfixe de locale dans l'URL
    // /dashboard        → /en/dashboard
    // /en/consultants   → /consultants
    let newPath = pathname

    if (locale !== 'fr') {
      // Retirer le préfixe actuel (ex: /en)
      newPath = pathname.replace(`/${locale}`, '') || '/'
    }

    if (code !== 'fr') {
      // Ajouter le nouveau préfixe
      newPath = `/${code}${newPath}`
    }

    router.push(newPath)
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
