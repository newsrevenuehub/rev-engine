import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import Analytics from 'analytics';
import {
  HUB_GA_V3_ID,
  HUB_ANALYTICS_APP_NAME,
  HUB_GA_V3_PLUGIN_NAME,
  ORG_GA_V3_PLUGIN_NAME
} from 'constants/analyticsConstants';
import getHubGaPlugin from 'components/analytics/plugins/ga/hub';
import getOrgGaPlugin from 'components/analytics/plugins/ga/org';

export default function OrgAndHubTrackedPage({ component: Component, ...rest }) {
  const location = useLocation();
  const [orgAnalyticsState, setOrgAnalyticsState] = useState({
    orgGaId: null,
    orgGaDomain: null,
    orgAnalyticsRetrieveAttempted: false
  });
  const [analyticsInstance, setAnalyticsInstance] = useState(null);

  const { orgAnalyticsRetrieveAttempted, orgGaId, orgGaDomain } = orgAnalyticsState;

  // load analytics
  useEffect(() => {
    if (!analyticsInstance && orgAnalyticsRetrieveAttempted && HUB_GA_V3_ID) {
      const plugins = [getHubGaPlugin(HUB_GA_V3_ID, HUB_GA_V3_PLUGIN_NAME)];
      if (orgGaId && orgGaDomain) {
        const orgPlugin = getOrgGaPlugin(orgGaId, orgGaDomain, ORG_GA_V3_PLUGIN_NAME);
        plugins.push(orgPlugin);
      }
      const analytics = Analytics({
        app: HUB_ANALYTICS_APP_NAME,
        plugins: plugins
      });
      setAnalyticsInstance(analytics);
    }
  }, [analyticsInstance, orgGaId, orgGaDomain, orgAnalyticsRetrieveAttempted]);

  // when page changes, fire page view if analytics loaded
  useEffect(() => {
    if (analyticsInstance) {
      analyticsInstance.page();
    }
  }, [analyticsInstance, location.pathname]);

  const setOrgAnalytics = (orgGaId, orgGaDomain) => {
    setOrgAnalyticsState({
      orgAnalyticsRetrieveAttempted: true,
      orgGaId,
      orgGaDomain
    });
  };

  return <Component {...rest} setOrgAnalytics={setOrgAnalytics} />;
}
