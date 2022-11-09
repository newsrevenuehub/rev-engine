import { Redirect } from 'react-router-dom';

import { SentryRoute } from 'hooks/useSentry';

// Routes
import { SIGN_IN } from 'routes';
import isAuthenticated from 'utilities/isAuthenticated';

/**
 * ProtectedRoute either verifies authentication status or redirects to SIGN_IN.
 * Accepts 'contributor' prop so isAuthenticated can check for the right user type.
 */
function ProtectedRoute({ contributor, ...props }) {
  if (isAuthenticated(contributor)) {
    return <SentryRoute {...props} />;
  }
  return <Redirect to={SIGN_IN} />;
}

export default ProtectedRoute;
