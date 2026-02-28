import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? 'fr';

  return {
    locale,
    // Cette syntaxe est mieux interprétée par les bundlers de Workers
    messages: (await import(`./messages/${locale}.json`)).default
  };
});