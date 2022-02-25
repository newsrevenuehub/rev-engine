export const LOGIN = '/login';

export const SCOPED_ROUTE = '/:orgSlug/:revProgramSlug';
export const DASHBOARD_BASE = '';
export const CONTENT_SLUG_PART = '/content';
export const CONTENT_SLUG = DASHBOARD_BASE + SCOPED_ROUTE + CONTENT_SLUG_PART;
export const DONATIONS_SLUG_PART = '/contributions';
export const DONATIONS_SLUG = DASHBOARD_BASE + SCOPED_ROUTE + DONATIONS_SLUG_PART;
export const CONNECT_SLUG_PART = '/connect';
export const CONNECT_SLUG = DASHBOARD_BASE + SCOPED_ROUTE + CONNECT_SLUG_PART;
export const EDITOR_SLUG_PART = '/edit';
export const EDITOR_SLUG = DASHBOARD_BASE + SCOPED_ROUTE + EDITOR_SLUG_PART + '/:pageSlug';

// Live Page
export const DONATION_PAGE_SLUG = '/:pageSlug';
export const THANK_YOU_SLUG = '/thank-you';

// Contributor
export const CONTRIBUTOR_ENTRY = '/contributor';
export const CONTRIBUTOR_VERIFY = '/contributor-verify';
export const CONTRIBUTOR_DASHBOARD = CONTRIBUTOR_ENTRY + '/contributions';
