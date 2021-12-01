// These subdomain labels will redirect to the org portal.
export const ORG_PORTAL_SUBDOMAINS = ['', 'support'];

//Rev Engine - General
export const REVENGINE_API_VERSION = window.ENV?.REVENGINE_API_VERSION || 'v1';
export const FREQUENCY_QUERYPARAM = window.ENV?.FREQUENCY_QUERYPARAM || 'frequency';
export const AMOUNT_QUERYPARAM = window.ENV?.AMOUNT_QUERYPARAM || 'amount';
export const CAPTURE_PAGE_SCREENSHOT = window.ENV?.CAPTURE_PAGE_SCREENSHOT === 'true';

// Analytics
export const HUB_ANALYTICS_APP_NAME = 'rev-engine-analytics';
export const HUB_GA_V3_PLUGIN_NAME = 'ga-v3-hub';
// Actual GA ID is stored in the Heroku config vars for app. Mock ID used here for cypress tests
export const HUB_GA_V3_ID = window.ENV?.HUB_V3_GOOGLE_ANALYTICS_ID || 'UA-37373737yesyesyes';
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
export const HUB_GOOGLE_MAPS_API_KEY = window.ENV?.HUB_GOOGLE_MAPS_API_KEY;

// Stripe
export const HUB_STRIPE_API_PUB_KEY = window.ENV?.HUB_STRIPE_API_PUB_KEY;
export const STRIPE_API_VERSION = window.ENV?.STRIPE_API_VERSION;
export const STRIPE_CLIENT_ID = window.ENV?.STRIPE_CLIENT_ID;
export const STRIPE_OAUTH_SCOPE = window.ENV?.STRIPE_OAUTH_SCOPE;

// Salesforce
export const SALESFORCE_CAMPAIGN_ID_QUERYPARAM = window.ENV?.SALESFORCE_CAMPAIGN_ID_QUERYPARAM || 'campaign';
