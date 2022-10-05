import * as ROUTES from 'routes';

function isContributorAppPath() {
  const pathname = window.location.pathname;
  const routes = [ROUTES.CONTRIBUTOR_ENTRY, ROUTES.CONTRIBUTOR_VERIFY, ROUTES.CONTRIBUTOR_DASHBOARD];

  // Be lenient about trailing slashes in the actual pathname.

  return routes.includes(pathname) || routes.includes(pathname + '/');
}

export default isContributorAppPath;
