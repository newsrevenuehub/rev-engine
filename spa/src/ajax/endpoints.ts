import { EmailCustomization } from 'hooks/useEmailCustomizations';
import { RevenueProgram } from 'hooks/useRevenueProgram';

export const TOKEN = 'token/';
export const USER = 'users/';

export const STRIPE_OAUTH = 'stripe/oauth/';
export const STRIPE_PAYMENT = 'stripe/payment/';

export const getStripeAccountLinkStatusPath = (rpId: number) => {
  return `handle-stripe-account-link/${rpId}/`;
};

export const AUTHORIZE_STRIPE_PAYMENT_ROUTE = 'payments/';

export function getPaymentSuccessEndpoint(clientProviderSecretId: string) {
  return `payments/${clientProviderSecretId}/success/`;
}

// Email customizations
export const EMAIL_CUSTOMIZATIONS = 'emails/customizations/';

export function getEmailCustomizationEndpoint(id: EmailCustomization['id']) {
  return `emails/customizations/${id}/`;
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

export function getRevenueProgramActiveCampaignStatusEndpoint(revenueProgramId: RevenueProgram['id']) {
  return `/revenue-programs/${revenueProgramId}/activecampaign_configure/`;
}

export function getRevenueProgramMailchimpStatusEndpoint(revenueProgramId: RevenueProgram['id']) {
  return `/revenue-programs/${revenueProgramId}/mailchimp_configure/`;
}

// Contributions
export function getContributorImpactEndpoint(contributorId: number) {
  return `/contributors/${contributorId}/impact/`;
}

export function getContributionsEndpoint(contributorId: number, queryParams?: string) {
  return `/contributors/${contributorId}/contributions/${queryParams ? `?${queryParams}` : ''}`;
}

export function getContributionDetailEndpoint(contributorId: number, contributionId: number) {
  return `/contributors/${contributorId}/contributions/${contributionId}/`;
}

export function getContributionSendEmailReceiptEndpoint(contributorId: number, contributionId: number) {
  return `${getContributionDetailEndpoint(contributorId, contributionId)}send-receipt/`;
}

export const CONTRIBUTIONS = 'contributions/';

export function getAdminContributionEndpoint(contributionId: number) {
  return `${CONTRIBUTIONS}${contributionId}/`;
}

export const EMAIL_CONTRIBUTIONS = 'email-contributions/';
export const PROCESS_FLAGGED = 'process-flagged/';
export const SUBSCRIPTIONS = 'subscriptions/';

// Contributor Portal
export const GET_MAGIC_LINK = 'contrib-email/';
export const VERIFY_TOKEN = 'contrib-verify/';
export const UPDATE_PAYMENT_METHOD = 'update-payment-method/';

// Account
export const FORGOT_PASSWORD_ENDPOINT = 'users/password_reset/';
export const RESET_PASSWORD_ENDPOINT = 'users/password_reset/confirm/';
export const VERIFY_EMAIL_REQUEST_ENDPOINT = 'users/request_account_verification/';
export const CUSTOMIZE_ACCOUNT_ENDPOINT = 'customize_account/';

// Organization
export const PATCH_ORGANIZATION = 'organizations/';

// Revenue Programs
export const REVENUE_PROGRAM = 'revenue-programs/';

// Mailchimp
export const MAILCHIMP_OAUTH_SUCCESS = 'mailchimp-oauth-success/';

export const SEND_TEST_EMAIL = 'send-test-email/';
