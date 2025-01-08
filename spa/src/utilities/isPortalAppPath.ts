import { PORTAL } from 'routes';

function isPortalAppPath() {
  // Check if current path has at least "/portal" or "/contributor"* at the
  // start of the path. We need both so that the portal can redirect old links
  // to "/contributor".
  //
  // * We need to exclude `/contributor-portal` because that's a valid path for
  //   the admin dashboard.
  return (
    window.location.pathname.startsWith(PORTAL.ENTRY.replace(/\/$/, '')) ||
    (window.location.pathname.startsWith('/contributor') && !window.location.pathname.startsWith('/contributor-portal'))
  );
}

export default isPortalAppPath;
