/*
  These constants may be static values, or read from the "environment".
  Constants read from the "environment" locally are analyzed by webpack and 
  converted to static values at build time using the built-in 
  .env -> "REACT_APP_ENV_VAR" -> string
  Constants read from the "environment" in a deployed environment are actually added
  to the window object when the initial index.html is requested and are available as properties
  of window.ENV.
*/

// These subdomain labels will redirect to the org portal.
export const DASHBOARD_SUBDOMAINS = resolveConstantFromEnv('DASHBOARD_SUBDOMAINS', ['', 'www', 'support']);

//Rev Engine - General
export const REVENGINE_API_VERSION = resolveConstantFromEnv('REVENGINE_API_VERSION', 'v1');
export const FREQUENCY_QUERYPARAM = resolveConstantFromEnv('FREQUENCY_QUERYPARAM', 'frequency');
export const AMOUNT_QUERYPARAM = resolveConstantFromEnv('AMOUNT_QUERYPARAM', 'amount');
export const SALESFORCE_CAMPAIGN_ID_QUERYPARAM = resolveConstantFromEnv(
  'SALESFORCE_CAMPAIGN_ID_QUERYPARAM',
  'campaign'
);
export const CAPTURE_PAGE_SCREENSHOT = resolveConstantFromEnv('CAPTURE_PAGE_SCREENSHOT');

// Analytics
export const HUB_ANALYTICS_APP_NAME = 'rev-engine-analytics';
export const HUB_GA_V3_PLUGIN_NAME = 'ga-v3-hub';
// Actual GA ID is stored in the Heroku config vars for app. Mock ID used here for cypress tests
export const HUB_GA_V3_ID = resolveConstantFromEnv('HUB_V3_GOOGLE_ANALYTICS_ID', 'UA-37373737yesyesyes');
export const ORG_GA_V3_PLUGIN_NAME = 'ga-v3-org';

// Auth
export const LS_USER = 'REVENGINE_USER';
export const LS_CONTRIBUTOR = 'REVENGINE_CONTRIBUTOR';
export const LS_CSRF_TOKEN = 'CSRF_TOKEN';
export const CSRF_HEADER = 'X-CSRFTOKEN';
export const PASSWORD_RESET_URL = '/users/password-reset/';

// Google reCAPTCHA
export const GRECAPTCHA_SCRIPT_URL = 'https://www.google.com/recaptcha/api.js';
export const GRECAPTCHA_SITE_KEY = '6Lfuse8UAAAAAD9E6tCxKYrxO1IbnXp8IBa4u5Ri';

// Google Maps
export const HUB_GOOGLE_MAPS_API_KEY = resolveConstantFromEnv('HUB_GOOGLE_MAPS_API_KEY');

// Sentry
export const SENTRY_ENABLE_FRONTEND = resolveConstantFromEnv('SENTRY_ENABLE_FRONTEND', false);
export const SENTRY_DSN_FRONTEND = resolveConstantFromEnv('SENTRY_DSN_FRONTEND');

// Stripe
export const HUB_STRIPE_API_PUB_KEY = resolveConstantFromEnv('HUB_STRIPE_API_PUB_KEY');
export const STRIPE_API_VERSION = resolveConstantFromEnv('STRIPE_API_VERSION', '2020-08-27');
export const STRIPE_CLIENT_ID = resolveConstantFromEnv('STRIPE_CLIENT_ID', 'test_1234');
export const STRIPE_OAUTH_SCOPE = resolveConstantFromEnv('STRIPE_OAUTH_SCOPE', 'read_write');

// Environment {production, staging, test, dev, demo}
export const ENVIRONMENT = resolveConstantFromEnv('ENVIRONMENT');

function resolveConstantFromEnv(constantName, defaultValue) {
  /*
    If we're in development, use webpack's process.env string replace.
    If not, use window.ENV vars.
    Oddly enough, this dynamically read process.env[ENV_VAR_NAME] seems to work here, despite the fact that
    webpack seems to do a relatively simple string replace on "process.env.ENV_VAR" at build time.
  */
  if (process.env.NODE_ENV === 'development') return process.env[`REACT_APP_${constantName}`] || defaultValue;
  else if (window.ENV) return window.ENV[constantName] || defaultValue;
  else return defaultValue;
}
