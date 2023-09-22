import { ComponentType, useEffect } from 'react';
import { useLocation } from 'react-router';

import { useAnalyticsContext } from './AnalyticsContext';

export default function TrackPageView({
  children,
  component: Component,
  ...rest
}: React.PropsWithChildren<{
  component?: ComponentType;
  [x: string]: any;
}>) {
  const location = useLocation();
  const { analyticsInstance } = useAnalyticsContext();

  // when page changes, fire page view if analytics loaded
  useEffect(() => {
    analyticsInstance?.page();
  }, [location.pathname, analyticsInstance]);

  if (children) {
    return <>{children}</>;
  }

  if (!Component) {
    throw new Error('TrackPageView must have either children or a component prop');
  }

  return <Component {...rest} />;
}
