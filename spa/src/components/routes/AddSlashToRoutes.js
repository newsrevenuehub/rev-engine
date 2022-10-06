import { Redirect, useLocation } from 'react-router-dom';

/**
 * Wraps a set of routes with a redirect to force a trailing slash. The route
 * paths themselves *must* have a trailing slash.
 */
export const AddSlashToRoutes = (props) => {
  const location = useLocation();

  if (!location) {
    throw new Error('AddToSlash must be a child of a Router');
  }

  if (location.pathname && !/\/$/.test(location.pathname)) {
    return <Redirect to={{ ...location, pathname: location.pathname + '/' }} />;
  }

  return props.children;
};

export default AddSlashToRoutes;
