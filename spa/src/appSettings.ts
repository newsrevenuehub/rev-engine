// These constants may be static values, or read from the "environment".
// Constants read from the "environment" locally are provided by Vite.
//
// Constants read from the "environment" in a deployed environment are actually
// added to the window object when the initial index.html is requested and are
// available as properties of window.ENV.

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
export const MAILCHIMP_CAMPAIGN_ID_QUERYPARAM = resolveConstantFromEnv('MAILCHIMP_CAMPAIGN_ID_QUERYPARAM', 'mc_cid');
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
export const SS_CONTRIBUTOR = 'REVENGINE_CONTRIBUTOR';
export const LS_CSRF_TOKEN = 'CSRF_TOKEN';
export const CSRF_HEADER = 'X-CSRFTOKEN';
export const PASSWORD_RESET_URL = '/users/password-reset/';

// Cloudflare
export const USE_CLOUDFLARE_IMAGE_TRANSFORMATIONS = resolveConstantFromEnv(
  'USE_CLOUDFLARE_IMAGE_TRANSFORMATIONS',
  false
);

// Google reCAPTCHA
export const GRECAPTCHA_SITE_KEY = '6Lfuse8UAAAAAD9E6tCxKYrxO1IbnXp8IBa4u5Ri';

// Google Maps
export const HUB_GOOGLE_MAPS_API_KEY = resolveConstantFromEnv('HUB_GOOGLE_MAPS_API_KEY');

// Sentry
export const SENTRY_ENABLE_FRONTEND = resolveConstantFromEnv('SENTRY_ENABLE_FRONTEND', false);
export const SENTRY_DSN_FRONTEND = resolveConstantFromEnv('SENTRY_DSN_FRONTEND');

// Stripe
export const HUB_STRIPE_API_PUB_KEY = resolveConstantFromEnv('HUB_STRIPE_API_PUB_KEY', 'test_api_key');
export const STRIPE_API_VERSION = resolveConstantFromEnv('STRIPE_API_VERSION', '2020-08-27');
export const STRIPE_CLIENT_ID = resolveConstantFromEnv('STRIPE_CLIENT_ID', 'test_1234');
export const STRIPE_OAUTH_SCOPE = resolveConstantFromEnv('STRIPE_OAUTH_SCOPE', 'read_write');
export const STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL = resolveConstantFromEnv(
  'STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL'
);
export const STRIPE_SELF_UPGRADE_PRICING_TABLE_ID = resolveConstantFromEnv('STRIPE_SELF_UPGRADE_PRICING_TABLE_ID');
export const STRIPE_SELF_UPGRADE_PRICING_TABLE_PUBLISHABLE_KEY = resolveConstantFromEnv(
  'STRIPE_SELF_UPGRADE_PRICING_TABLE_PUBLISHABLE_KEY'
);

// Mailchimp
export const NRE_MAILCHIMP_CLIENT_ID = resolveConstantFromEnv('NRE_MAILCHIMP_CLIENT_ID');

// Pendo
export const PENDO_API_KEY = resolveConstantFromEnv('PENDO_API_KEY');
export const PENDO_VISITOR_PREFIX = resolveConstantFromEnv('PENDO_VISITOR_PREFIX');

// Environment {production, staging, test, dev, demo}
export const ENVIRONMENT = resolveConstantFromEnv('ENVIRONMENT');

// Host map for client custom domains. This should be a JSON-encoded dictionary
// of { "customhostname.org": "rp-slug" } values. We parse here so that each
// consumer doesn't need to.
export let HOST_MAP: Record<string, string> = {};

const rawHostMap = resolveConstantFromEnv('HOST_MAP');

if (typeof rawHostMap === 'string') {
  try {
    HOST_MAP = JSON.parse(rawHostMap);
  } catch {
    // Continue silently. Either the variable isn't set or is malformed JSON.
  }
}

function resolveConstantFromEnv(constantName: string, defaultValue?: boolean | string | string[]) {
  // If we're in development, use Vite environment variables. If not, use
  // window.ENV vars set by Django. ||s for compares here are to maintain
  // existing functionality as ?? has different behavior with null values.

  if (process.env.NODE_ENV === 'development') {
    return import.meta.env[`VITE_${constantName}`] || defaultValue;
  }

  if ((window as any).ENV) {
    return (window as any).ENV[constantName] || defaultValue;
  }

  return defaultValue;
}
