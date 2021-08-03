import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

import Analytics from 'analytics';
import {
  HUB_GA_V3_ID,
  HUB_ANALYTICS_APP_NAME,
  HUB_GA_V3_PLUGIN_NAME,
  ORG_GA_V3_PLUGIN_NAME
} from 'analytics/constants';
import getHubGaPlugin from 'analytics/plugins/ga/hub';
import getOrgGaPlugin from 'analytics/plugins/ga/org';

export default function OrgAndHubTrackedRoute({ component: Component, ...rest }) {
  const location = useLocation();
  const [orgGaId, setOrgGaId] = useState(null);
  const [orgDomain, setOrgDomain] = useState(null);
  const [analyticsInstance, setAnalyticsInstance] = useState(null);
  // load analytics
  useEffect(() => {
    if (!analyticsInstance && orgGaId && orgDomain && HUB_GA_V3_ID) {
      const plugins = [
        getHubGaPlugin(HUB_GA_V3_ID, HUB_GA_V3_PLUGIN_NAME),
        getOrgGaPlugin(orgGaId, orgDomain, ORG_GA_V3_PLUGIN_NAME)
      ];
      const analytics = Analytics({
        app: HUB_ANALYTICS_APP_NAME,
        plugins: plugins
      });
      setAnalyticsInstance(analytics);
    }
  }, [analyticsInstance, orgGaId, orgDomain]);

  // when page changes, fire page view if analytics loaded
  useEffect(() => {
    if (analyticsInstance) {
      analyticsInstance.page();
    }
  }, [analyticsInstance, location.pathname]);

  const setOrgAnalytics = (orgGaId, orgDomain) => {
    setOrgGaId(orgGaId);
    setOrgDomain(orgDomain);
  };

  return <Component {...rest} setOrgAnalytics={setOrgAnalytics} />;
}
