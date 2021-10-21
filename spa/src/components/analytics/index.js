import { useEffect } from 'react';
import { useAnalyticsContext } from './AnalyticsContext';
import { HUB_GA_V3_ID } from 'constants/analyticsConstants';

export function useConfigureAnalytics({
  orgGaV3Id,
  orgGaV3Domain,
  orgGaV4Id,
  orgFbPixelId,
  hubGaV3Id = HUB_GA_V3_ID
} = {}) {
  const { setAnalyticsConfig } = useAnalyticsContext();

  useEffect(() => {
    setAnalyticsConfig({ hubGaV3Id, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId });
  }, [hubGaV3Id, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId]);
}
