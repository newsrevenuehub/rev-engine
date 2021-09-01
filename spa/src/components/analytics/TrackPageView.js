import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { useAnalyticsContext } from './AnalyticsContext';

export default function TrackPageView({ component: Component, ...rest }) {
  const location = useLocation();
  const { analyticsInstance } = useAnalyticsContext();

  // when page changes, fire page view if analytics loaded
  useEffect(() => {
    analyticsInstance?.page();
  }, [location.pathname, analyticsInstance]);

  return <Component {...rest} />;
}
