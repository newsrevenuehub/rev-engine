import { Redirect, RouteProps } from 'react-router-dom';
import { SentryRoute } from 'hooks/useSentry';
import { SIGN_IN } from 'routes';
import isAuthenticated from 'utilities/isAuthenticated';

export interface ProtectedRouteProps extends RouteProps {
  /**
   * If true, then the user must be a contributor, not an admin, to access this
   * route.
   */
  contributor?: boolean;
}

/**
 * ProtectedRoute either verifies authentication status or redirects to SIGN_IN.
 * Accepts 'contributor' prop so isAuthenticated can check for the right user type.
 */
function ProtectedRoute({ contributor, ...props }: ProtectedRouteProps) {
  if (isAuthenticated(contributor)) {
    return <SentryRoute {...props} />;
  }

  return <Redirect to={SIGN_IN} />;
}

export default ProtectedRoute;
