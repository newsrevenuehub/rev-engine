import { createContext, useContext, useState, useEffect, SetStateAction, Dispatch, ReactNode } from 'react';
import Analytics, { AnalyticsInstance } from 'analytics';
import { HUB_ANALYTICS_APP_NAME, HUB_GA_V3_PLUGIN_NAME, ORG_GA_V3_PLUGIN_NAME } from 'appSettings';
import getHubGaPlugin from 'components/analytics/plugins/ga/v3/hub';
import getOrgGaPlugin from 'components/analytics/plugins/ga/v3/org';
import getGaV4Plugin from 'components/analytics/plugins/ga/v4';
import getFbPixelPlugin, { FB_PIXEL_PLUGIN_NAME } from 'components/analytics/plugins/facebookPixel';

export interface AnalyticsConfig {
  /**
   * Google Analytics ID used by News Revenue Hub.
   */
  hubGaV3Id: string;
  /**
   * The organization's Facebook pixel ID, if any.
   */
  orgFbPixelId?: string | null;
  /**
   * The organization's Google Analytics v3 (aka Universal Analytics) account ID.
   */
  orgGaV3Id?: string | null;
  /**
   * The organization's Google Analytics v3 (aka Universal Analytics) domain name.
   */
  orgGaV3Domain?: string | null;
  /**
   * The organization's Google Analytics v4 account ID.
   */
  orgGaV4Id?: string | null;
}

export interface UseAnalyticsContextResult {
  // Maintaining null types here for existing code.

  /**
   * The main analytics instance which can be used for tracking events.
   */
  analyticsInstance: AnalyticsInstance | null;

  /**
   * Sets configuration of the analytics instance.
   */
  setAnalyticsConfig: Dispatch<SetStateAction<AnalyticsConfig | null>>;

  /**
   * Tracks a conversion of a certain contribution amount. This allows strings
   * to maintain compatibility with existing code.
   */
  trackConversion: (amount: number | string) => void;
}

export const AnalyticsContext = createContext<UseAnalyticsContextResult>({
  analyticsInstance: null,
  setAnalyticsConfig() {
    throw new Error('AnalyticsContext must be used inside a AnalyticsContextProvider.');
  },
  trackConversion() {
    throw new Error('AnalyticsContext must be used inside a AnalyticsContextProvider.');
  }
});

export const useAnalyticsContext = () => useContext(AnalyticsContext);

/**
 * Coerces a null value to undefined. We do this because organizations might
 * have null values for their tracking IDs, and we want to treat them as
 * undefined.
 */
function coerceNullToUndefined(value?: string | null) {
  return value === null ? undefined : value;
}

function getAnalyticsPlugins(
  hubGaV3Id?: string,
  orgGaV3Id?: string,
  orgGaV3Domain?: string,
  orgGaV4Id?: string,
  orgFbPixelId?: string
) {
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

export const AnalyticsContextProvider = ({ children }: { children: ReactNode }) => {
  const [analyticsInstance, setAnalyticsInstance] = useState<AnalyticsInstance | null>(null);
  const [analyticsConfig, setAnalyticsConfig] = useState<AnalyticsConfig | null>(null);
  const trackConversion = (amount: number | string) => {
    const plugins = analyticsInstance?.plugins;

    if (plugins && FB_PIXEL_PLUGIN_NAME in plugins) {
      // This cast to any is because it's invoking a method provided by our
      // custom Analytics plugin at plugins/facebookPixel.js.
      (plugins[FB_PIXEL_PLUGIN_NAME] as any).trackConversion(amount);
    }
  };

  useEffect(() => {
    if (analyticsConfig && !analyticsInstance) {
      const { hubGaV3Id, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId } = analyticsConfig;
      const plugins = getAnalyticsPlugins(
        hubGaV3Id,
        coerceNullToUndefined(orgGaV3Id),
        coerceNullToUndefined(orgGaV3Domain),
        coerceNullToUndefined(orgGaV4Id),
        coerceNullToUndefined(orgFbPixelId)
      );
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
