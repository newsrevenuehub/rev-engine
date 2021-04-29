import { Route } from "react-router";

// Children
import Login from "components/authentication/Login";
import isAuthenticated from "utilities/isAuthenticated";

function ProtectedRoute({ children, ...props }) {
  if (isAuthenticated()) {
    return <Route {...props}>{children}</Route>;
  }
  return (
    <Route {...props}>
      <Login redirect />
    </Route>
  );
}

export default ProtectedRoute;
