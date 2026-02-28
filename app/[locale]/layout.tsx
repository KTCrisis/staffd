import { NextIntlClientProvider } from 'next-intl'
import { getMessages }            from 'next-intl/server'
import { ThemeProvider }          from '@/components/layout/ThemeProvider'
import { AuthProvider }           from '@/components/layout/AuthProvider'
import { Sidebar }                from '@/components/layout/Sidebar'
import '@/styles/globals.css'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages   = await getMessages()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </NextIntlClientProvider>
  )
}
