import googleAnalytics from '@analytics/google-analytics';

export default function getPlugin(hubGaId, pluginName) {
  return {
    ...googleAnalytics({
      trackingId: hubGaId
    })
  };
}
