import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

import Analytics from 'analytics';
import { HUB_ANALYTICS_APP_NAME, HUB_GA_V3_ID, HUB_GA_V3_PLUGIN_NAME } from 'constants/analyticsConstants';
import getHubGaPlugin from './plugins/ga/v3/hub';

export default function HubTrackedPage({ component: Component }) {
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
