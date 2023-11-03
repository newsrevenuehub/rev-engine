import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

// Borrowed from https://react.i18next.com/latest/using-with-hooks

i18n
  // load translation using http -> see /public/locales (i.e. https://github.com/i18next/react-i18next/tree/master/example/react/public/locales)
  // learn more: https://github.com/i18next/i18next-http-backend
  .use(Backend)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    backend: {
      loadPath: '/static/locales/{{lng}}/{{ns}}.json'
    },
    fallbackLng: 'en',
    debug: import.meta.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false // not needed for react as it escapes by default
    },
    lng: 'en'
  });

/**
 * This global instance of i18next is a fallback that currently only ever uses
 * English. It's here for any localized components outside of a donation page.
 * If you want to work with the i18n instance on a published contribution page,
 * you must use `useTranslation()` instead of importing this.
 */
export default i18n;
