import { Route, Redirect } from 'react-router';

// Routes
import { LOGIN } from 'routes';
import isAuthenticated from 'utilities/isAuthenticated';

function ProtectedRoute({ ...props }) {
  if (isAuthenticated()) {
    return <Route {...props} />;
  }
  return <Redirect to={LOGIN} />;
}

export default ProtectedRoute;
