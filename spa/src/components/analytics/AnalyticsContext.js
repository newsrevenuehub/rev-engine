import { createContext, useContext, useState, useEffect } from 'react';
import Analytics from 'analytics';
import { HUB_ANALYTICS_APP_NAME, HUB_GA_V3_PLUGIN_NAME, ORG_GA_V3_PLUGIN_NAME } from 'settings';
import getHubGaPlugin from 'components/analytics/plugins/ga/v3/hub';
import getOrgGaPlugin from 'components/analytics/plugins/ga/v3/org';
import getGaV4Plugin from 'components/analytics/plugins/ga/v4';
import getFbPixelPlugin, { FB_PIXEL_PLUGIN_NAME } from 'components/analytics/plugins/facebookPixel';

const AnalyticsContext = createContext(null);

function getAnalyticsPlugins(hubGaV3Id, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId) {
  const plugins = [getHubGaPlugin(hubGaV3Id, HUB_GA_V3_PLUGIN_NAME)];
  if (orgGaV3Id && orgGaV3Domain) {
    plugins.push(getOrgGaPlugin(orgGaV3Id, orgGaV3Domain, ORG_GA_V3_PLUGIN_NAME));
  }
  if (orgGaV4Id) {
    plugins.push(getGaV4Plugin(orgGaV4Id));
  }
  if (orgFbPixelId) {
    plugins.push(getFbPixelPlugin(orgFbPixelId));
  }
  return plugins;
}

export const AnalyticsContextWrapper = ({ children }) => {
  const [analyticsInstance, setAnalyticsInstance] = useState(null);
  const [analyticsConfig, setAnalyticsConfig] = useState(null);

  const trackConversion = (amount) => {
    const plugins = analyticsInstance?.plugins;
    if (plugins && plugins[FB_PIXEL_PLUGIN_NAME]) {
      analyticsInstance.plugins[FB_PIXEL_PLUGIN_NAME].trackConversion(amount);
    }
  };

  useEffect(() => {
    if (analyticsConfig && !analyticsInstance) {
      const { hubGaV3Id, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId } = analyticsConfig;
      const plugins = getAnalyticsPlugins(hubGaV3Id, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId);
      const analytics = Analytics({ app: HUB_ANALYTICS_APP_NAME, plugins });
      setAnalyticsInstance(analytics);
    }
  }, [analyticsConfig, analyticsInstance]);

  return (
    <AnalyticsContext.Provider value={{ analyticsInstance, setAnalyticsConfig, trackConversion }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalyticsContext = () => useContext(AnalyticsContext);
