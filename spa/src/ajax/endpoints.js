export const TOKEN = 'token/';
export const USER = 'users/';

export const STRIPE_OAUTH = 'stripe/oauth/';
export const STRIPE_PAYMENT = 'stripe/payment/';
export const STRIPE_CONFIRMATION = 'stripe/confirmation/';
export const STRIPE_ACCOUNT_LINK_CREATE = 'create-stripe-account-link/';
export const STRIPE_ACCOUNT_LINK_CREATE_COMPLETE = 'create-stripe-account-link-complete/';

export const getStripeAccountLinkCreatePath = (rpId) => {
  return `${STRIPE_ACCOUNT_LINK_CREATE}${rpId}/`;
};

export const getStripeAccountLinkCreateCompletePath = (rpId) => {
  return `${STRIPE_ACCOUNT_LINK_CREATE_COMPLETE}${rpId}/`;
};

export const AUTHORIZE_ONE_TIME_STRIPE_PAYMENT_ROUTE = 'payments/one-time/';
export const AUTHORIZE_STRIPE_SUBSCRIPTION_ROUTE = 'payments/subscription/';

export function getPaymentSuccessEndpoint(clientProviderSecretId) {
  return `payments/${clientProviderSecretId}/success/`;
}

// Pages
export const LIVE_PAGE_DETAIL = 'pages/live-detail/';
export const DRAFT_PAGE_DETAIL = 'pages/draft-detail/';
export const LIST_PAGES = 'pages/';
export const PATCH_PAGE = 'pages/';
export const DELETE_PAGE = 'pages/';

// Templates
export const TEMPLATES = 'templates/';

// Styles
export const LIST_STYLES = 'styles/';
export const LIST_FONTS = 'fonts/';

// Revenue Programs
export const REVENUE_PROGRAMS = 'revenue-programs/';

// Contributions
export const CONTRIBUTIONS = 'contributions/';
export const PROCESS_FLAGGED = 'process-flagged/';
export const SUBSCRIPTIONS = 'subscriptions/';

// Contributor Portal
export const GET_MAGIC_LINK = 'contrib-email/';
export const VERIFY_TOKEN = 'contrib-verify/';
export const STRIPE_CUSTOMER_PORTAL = 'stripe/customer-portal/';
export const UPDATE_PAYMENT_METHOD = 'update-payment-method/';
export const CANCEL_RECURRING = 'cancel-recurring/';

// Account
export const FORGOT_PASSWORD_ENDPOINT = 'users/password_reset/';
export const RESET_PASSWORD_ENDPOINT = 'users/password_reset/confirm/';
export const VERIFY_EMAIL_REQUEST_ENDPOINT = 'users/request_account_verification/';
export const CUSTOMIZE_ACCOUNT_ENDPOINT = 'customize_account/';
