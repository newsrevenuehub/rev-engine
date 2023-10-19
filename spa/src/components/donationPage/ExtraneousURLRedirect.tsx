import { Redirect, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * This component redirects users who arrived at a contribution page with extra
 * URL parts, e.g. /donate/memberform/. It redirects them to the first URL chunk
 * regardless of what it is.
 */
export function ExtraneousURLRedirect() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();

  // Strip all but the first part of the path, and retain search params.

  const redirectPath = /^\/.*?\//.exec(pathname)?.[0];

  if (redirectPath) {
    return <Redirect to={redirectPath + search} />;
  }

  throw new Error(t('donationPage.extraneousURLRedirect.error', { pathname }));
}

export default ExtraneousURLRedirect;
