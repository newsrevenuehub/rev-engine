import googleAnalytics from '@analytics/google-analytics';
import { ORG_GA_V3_PLUGIN_NAME } from 'analytics/constants';
import { guaranteeWindowGa } from '.';

// NB! changing the instanceName and name signature need to be like this
// namely, instanceName should be something random, and name should be
// the plugin name. Setting both to plugin name causes this to fail,
// as does omitting instanceName altogether.
// Issue seems to stem from destructuring assignments gone awry
// here: https://github.com/DavidWells/analytics/blob/master/packages/analytics-plugin-google-analytics/src/browser.js#L50
export default function getPlugin(orgGaId, orgDomain, pluginName) {
  guaranteeWindowGa();
  return Object.assign(
    {},
    googleAnalytics({
      trackingId: orgGaId,
      instanceName: 'two'
    }),
    {
      name: pluginName
    }
  );
}
