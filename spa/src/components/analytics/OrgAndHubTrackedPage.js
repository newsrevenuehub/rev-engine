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
    orgGaV3Id: null,
    orgGaV3Domain: null,
    orgAnalyticsRetrieveAttempted: false
  });
  const [analyticsInstance, setAnalyticsInstance] = useState(null);

  const { orgAnalyticsRetrieveAttempted, orgGaV3Id, orgGaV3Domain } = orgAnalyticsState;

  // load analytics
  useEffect(() => {
    if (!analyticsInstance && orgAnalyticsRetrieveAttempted && HUB_GA_V3_ID) {
      const plugins = [getHubGaPlugin(HUB_GA_V3_ID, HUB_GA_V3_PLUGIN_NAME)];
      if (orgGaV3Id && orgGaV3Domain) {
        const orgPlugin = getOrgGaPlugin(orgGaV3Id, orgGaV3Domain, ORG_GA_V3_PLUGIN_NAME);
        plugins.push(orgPlugin);
      }
      const analytics = Analytics({
        app: HUB_ANALYTICS_APP_NAME,
        plugins: plugins
      });
      setAnalyticsInstance(analytics);
    }
  }, [analyticsInstance, orgGaV3Id, orgGaV3Domain, orgAnalyticsRetrieveAttempted]);

  // when page changes, fire page view if analytics loaded
  useEffect(() => {
    if (analyticsInstance) {
      analyticsInstance.page();
    }
  }, [analyticsInstance, location.pathname]);

  const setOrgAnalytics = (orgGaV3Id, orgGaV3Domain) => {
    setOrgAnalyticsState({
      orgAnalyticsRetrieveAttempted: true,
      orgGaV3Id,
      orgGaV3Domain
    });
  };

  return <Component {...rest} setOrgAnalytics={setOrgAnalytics} />;
}
