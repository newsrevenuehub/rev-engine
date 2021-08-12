import googleAnalytics from '@analytics/google-analytics';

// NB! The instanceName and name signature need to be like this
// namely, instanceName should be something random, and name should be
// the plugin name. Setting both to plugin name causes this to fail,
// as does omitting instanceName altogether.
// Issue seems to stem from destructuring assignments gone awry
// here: https://github.com/DavidWells/analytics/blob/master/packages/analytics-plugin-google-analytics/src/browser.js#L50
export default function getPlugin(orgGaV3Id, orgGaV3Domain, pluginName) {
  return Object.assign(
    {},
    googleAnalytics({
      trackingId: orgGaV3Id,
      instanceName: 'two'
    }),
    {
      name: pluginName,
      ready: ({ payload, config, instance }) => {
        const { ga } = window;
        ga(`${pluginName}.require`, 'linker');
        ga(`${pluginName}.linker:autolink`, [orgGaV3Domain]);
      }
    }
  );
}
