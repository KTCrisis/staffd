import { getRequestConfig } from 'next-intl/server';

const messageImports = {
  fr: () => import('../messages/fr.json'),
  en: () => import('../messages/en.json'),
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? 'fr';
  const validLocale = locale in messageImports ? locale as keyof typeof messageImports : 'fr';

  return {
    locale: validLocale,
    messages: (await messageImports[validLocale]()).default,
  };
});