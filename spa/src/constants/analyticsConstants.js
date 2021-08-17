export const HUB_ANALYTICS_APP_NAME = 'rev-engine-analytics';
export const HUB_GA_V3_PLUGIN_NAME = 'ga-v3-hub';
// when NRH-76 has been resolved, should use line below instead of two below
// export const { REACT_APP_HUB_V3_GOOGLE_ANALYTICS_ID: HUB_GA_V3_ID } = process.env;
const TEMP_HARD_CODED_HUB_GA_V3_ID = 'UA-89391894-3';
const NONSENSICAL_HUB_GA_V3_ID = 'UA-37373737yesyesyes';
export const HUB_GA_V3_ID = process.env == 'production' ? TEMP_HARD_CODED_HUB_GA_V3_ID : NONSENSICAL_HUB_GA_V3_ID;
export const ORG_GA_V3_PLUGIN_NAME = 'ga-v3-org';
