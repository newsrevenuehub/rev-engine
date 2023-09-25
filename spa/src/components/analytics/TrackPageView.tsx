import { useEffect } from 'react';
import { useLocation } from 'react-router';

import React from 'react';
import { useAnalyticsContext } from './AnalyticsContext';

export default function TrackPageView({
  children,
  ...rest
}: React.PropsWithChildren<{
  [x: string]: any;
}>) {
  const location = useLocation();
  const { analyticsInstance } = useAnalyticsContext();

  // when page changes, fire page view if analytics loaded
  useEffect(() => {
    analyticsInstance?.page();
  }, [location.pathname, analyticsInstance]);

  const renderChildren = () => {
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return null;

      return React.cloneElement(child, {
        ...rest
      });
    });
  };

  return <>{renderChildren()}</>;
}
