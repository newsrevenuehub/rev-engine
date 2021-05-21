import { Route, Redirect } from 'react-router';

// Routes
import { LOGIN } from 'routes';
import isAuthenticated from 'utilities/isAuthenticated';

function ProtectedRoute({ children, ...props }) {
  if (isAuthenticated()) {
    return <Route {...props}>{children}</Route>;
  }
  return <Redirect to={LOGIN} />;
}

export default ProtectedRoute;
