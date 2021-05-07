import { BrowserRouter } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';

// Slugs
import { DASHBOARD_SLUG } from 'routes';

// Children
import Dashboard from 'components/dashboard/Dashboard';

// TEMP
import TemporaryStripeCheckoutTest from 'components/TEMP/TemporaryStripeCheckoutTest';

function MainRoutes() {
  return (
    <BrowserRouter>
      <ProtectedRoute exact path={DASHBOARD_SLUG}>
        <Dashboard />
      </ProtectedRoute>
      <ProtectedRoute path="/temp-pretend-payment">
        <TemporaryStripeCheckoutTest />
      </ProtectedRoute>
    </BrowserRouter>
  );
}

export default MainRoutes;
