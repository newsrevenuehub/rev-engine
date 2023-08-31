import { Redirect, useLocation } from 'react-router-dom';

/**
 * This component redirects users who arrived at a contribution page with extra
 * URL parts, e.g. /donate/memberform/. It redirects them to the first URL chunk
 * regardless of what it is.
 */
export function ExtraneousURLRedirect() {
  const { pathname, search } = useLocation();

  // Strip all but the first part of the path, and retain search params.

  const redirectPath = /^\/.*?\//.exec(pathname)?.[0];

  if (redirectPath) {
    return <Redirect to={redirectPath + search} />;
  }

  throw new Error(`Asked to redirect away from extraneous URL elements, but couldn't find stem in path "${pathname}"`);
}

export default ExtraneousURLRedirect;
