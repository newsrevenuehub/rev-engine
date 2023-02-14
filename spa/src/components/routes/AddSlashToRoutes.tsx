import PropTypes, { InferProps } from 'prop-types';
import { Redirect, useLocation } from 'react-router-dom';

export type AddSlashToRoutesProps = InferProps<typeof AddSlashToRoutesPropTypes>;

/**
 * Wraps a set of routes with a redirect to force a trailing slash. The route
 * paths themselves *must* have a trailing slash.
 */
export const AddSlashToRoutes = ({ children }: AddSlashToRoutesProps) => {
  const location = useLocation();
  if (!location) {
    throw new Error('AddToSlash must be a child of a Router');
  }

  // Only redirect if pathname doesn't start with `//`
  // This will prevent a Redirect with data that will crash the app 
  if (location.pathname && !/\/$/.test(location.pathname) && !/^\/\//.test(location.pathname)) {
    return <Redirect to={{ ...location, pathname: location.pathname + '/' }} />;
  }

  return <>{children}</>;
};

const AddSlashToRoutesPropTypes = {
  children: PropTypes.node.isRequired
};

export default AddSlashToRoutes;
