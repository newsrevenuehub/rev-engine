import { useEffect, useState } from 'react';
import { useLocation, Route } from 'react-router';

import Analytics from 'analytics';
import { HUB_ANALYTICS_APP_NAME, HUB_GA_V3_ID, HUB_GA_V3_PLUGIN_NAME } from 'analytics/constants';
import getHubGaPlugin from 'analytics/plugins/ga/hub';

export default function HubTrackedRoute({ component: Component }) {
  const location = useLocation();
  const [analyticsInstance, setAnalyticsInstance] = useState(null);

  // load analytics
  useEffect(() => {
    if (!analyticsInstance) {
      const analytics = Analytics({
        app: HUB_ANALYTICS_APP_NAME,
        plugins: [getHubGaPlugin(HUB_GA_V3_ID, HUB_GA_V3_PLUGIN_NAME)]
      });
      setAnalyticsInstance(analytics);
    }
  }, [analyticsInstance]);

  // when page changes, fire page view if analytics loaded
  useEffect(() => {
    if (analyticsInstance) {
      analyticsInstance.page();
    }
  }, [location.pathname, analyticsInstance]);

  return <Component />;
}
