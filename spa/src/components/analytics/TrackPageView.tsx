import { useEffect } from 'react';
import { useLocation } from 'react-router';

import React from 'react';
import { useAnalyticsContext } from './AnalyticsContext';

export default function TrackPageView({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { analyticsInstance } = useAnalyticsContext();

  // when page changes, fire page view if analytics loaded
  useEffect(() => {
    analyticsInstance?.page();
  }, [location.pathname, analyticsInstance]);

  return <>{children}</>;
}
