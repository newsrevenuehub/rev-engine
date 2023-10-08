import * as ROUTES from 'routes';

function isPortalAppPath() {
  const pathname = window.location.pathname;
  const routes = Object.values(ROUTES.PORTAL);

  // Be lenient about trailing slashes in the actual pathname.
  return routes.includes(pathname) || routes.includes(pathname + '/');
}

export default isPortalAppPath;
