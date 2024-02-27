import { PORTAL } from 'routes';

function isPortalAppPath() {
  return window.location.pathname.indexOf(PORTAL.ENTRY) === 0;
}

export default isPortalAppPath;
