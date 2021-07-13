import { Route, Redirect } from 'react-router';

// Routes
import { LOGIN } from 'routes';
import isAuthenticated from 'utilities/isAuthenticated';

/**
 * ProtectedRoute either verifies authentication status or redirects to LOGIN.
 * Accepts 'contributor' prop so isAuthenticated can check for the right user type.
 */
function ProtectedRoute({ contributor, ...props }) {
  if (isAuthenticated(contributor)) {
    return <Route {...props} />;
  }
  return <Redirect to={LOGIN} />;
}

export default ProtectedRoute;
