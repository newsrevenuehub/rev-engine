import * as ROUTES from 'routes';

function isContributorAppPath() {
  const pathname = window.location.pathname;
  if (pathname === ROUTES.CONTRIBUTOR_ENTRY) return true;
  if (pathname === ROUTES.CONTRIBUTOR_VERIFY) return true;
  if (pathname === ROUTES.CONTRIBUTOR_DASHBOARD) return true;
  return false;
}

export default isContributorAppPath;
