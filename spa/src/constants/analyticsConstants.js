export const HUB_ANALYTICS_APP_NAME = 'rev-engine-analytics';
export const HUB_GA_V3_PLUGIN_NAME = 'ga-v3-hub';
// when NRH-76 has been resolved, should use line below instead of two below
// export const { HUB_V3_GOOGLE_ANALYTICS_ID: HUB_GA_V3_ID } = process.env;
const NONSENSICAL_HUB_GA_V3_ID = 'UA-37373737yesyesyes';
// until NRH-76 is resolved, if deploying to prod, will need to push a commit to main
// branch that changes this to the real NRH GA id.
export const HUB_GA_V3_ID = NONSENSICAL_HUB_GA_V3_ID;
export const ORG_GA_V3_PLUGIN_NAME = 'ga-v3-org';
