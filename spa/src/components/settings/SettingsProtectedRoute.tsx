import { Redirect, RouteProps } from 'react-router-dom';
import PropTypes from 'prop-types';
import { SentryRoute } from 'hooks/useSentry';

import useUser from 'hooks/useUser';
import { CONTENT_SLUG } from 'routes';

export interface SettingsProtectedRouteProps extends RouteProps {}

const SettingsProtectedRoute = ({ children, ...props }: SettingsProtectedRouteProps) => {
  const { user, isLoading } = useUser();
  const userHasSingleOrg = user?.organizations?.length === 1;

  if (!isLoading && !userHasSingleOrg) {
    return <Redirect to={CONTENT_SLUG} />;
  }

  return <SentryRoute {...props}>{children}</SentryRoute>;
};

SettingsProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired
};

export default SettingsProtectedRoute;
