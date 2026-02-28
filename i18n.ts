import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? 'fr'

  const messages = locale === 'en'
    ? (await import('./messages/en.json')).default
    : (await import('./messages/fr.json')).default

  return { locale, messages }
})