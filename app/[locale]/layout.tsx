import { NextIntlClientProvider } from 'next-intl'
import { ThemeProvider }          from '@/components/layout/ThemeProvider'
import '@/styles/globals.css'

import fr from '@/messages/fr.json'
import en from '@/messages/en.json'

const messages = { fr, en } as Record<string, Record<string, unknown>>

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale] ?? fr}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </NextIntlClientProvider>
  )
}