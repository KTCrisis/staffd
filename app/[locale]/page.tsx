import { redirect } from 'next/navigation'
export const runtime = 'edge'

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(locale === 'en' ? '/en/dashboard' : '/dashboard')
}
