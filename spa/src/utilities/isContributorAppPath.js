import * as ROUTES from 'routes';

function isContributorAppPath() {
  const pathname = window.location.pathname;
  return [ROUTES.CONTRIBUTOR_ENTRY, ROUTES.CONTRIBUTOR_VERIFY, ROUTES.CONTRIBUTOR_DASHBOARD].includes(pathname);
}

export default isContributorAppPath;
