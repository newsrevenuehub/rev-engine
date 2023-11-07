import { createInstance } from 'i18next';
import Backend from 'i18next-http-backend';
import PropTypes, { InferProps } from 'prop-types';
import { useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ContributionPage } from 'hooks/useContributionPage';

const ContributionPageI18nProviderPropTypes = {
  children: PropTypes.node.isRequired,
  page: PropTypes.object.isRequired
};

export interface ContributionPageI18nProviderProps extends InferProps<typeof ContributionPageI18nProviderPropTypes> {
  page: ContributionPage;
}

/**
 * Wraps children with an i18next provider component that initializes with a
 * contribution page's locale. We can't use the global instance because it will
 * default to English before the page loads and we know what language to set,
 * and so non-English pages will see a flash of English before settling on the
 * correct language.
 */
export function ContributionPage18nProvider({ children, page }: ContributionPageI18nProviderProps) {
  const i18n = useMemo(() => {
    const instance = createInstance();

    instance.use(Backend).init({
      backend: {
        loadPath: '/static/locales/{{lng}}/{{ns}}.json'
      },
      fallbackLng: 'en',
      debug: process.env.NODE_ENV === 'development',
      interpolation: {
        escapeValue: false // not needed for react as it escapes by default
      },
      lng: page.locale
    });

    return instance;
  }, [page.locale]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

ContributionPage18nProvider.propTypes = ContributionPageI18nProviderPropTypes;
export default ContributionPage18nProvider;
