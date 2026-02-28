import { getRequestConfig } from 'next-intl/server'
import fr from './messages/fr.json'
import en from './messages/en.json'

const messages: Record<string, Record<string, unknown>> = { fr, en }

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? 'fr'
  return {
    locale,
    messages: messages[locale] ?? fr,
  }
})