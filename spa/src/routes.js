export const LOGIN = '/login';
export const DASHBOARD_SLUG = '/dashboard';
export const DONATIONS_SLUG = DASHBOARD_SLUG + '/contributions';
export const CONTENT_SLUG = DASHBOARD_SLUG + '/content';
export const STYLES_SLUG = DASHBOARD_SLUG + '/customize';
export const CONNECT_SLUG = DASHBOARD_SLUG + '/connect';

export const EDITOR_ROUTE = DASHBOARD_SLUG + '/edit';
export const EDITOR_ROUTE_PAGE = EDITOR_ROUTE + '/:revProgramSlug/:pageSlug';
export const DONATION_PAGE_SLUG = '/:pageSlug';
export const THANK_YOU_SLUG = '/thank-you';

// Contributor
export const CONTRIBUTOR_ENTRY = '/contributor';
export const CONTRIBUTOR_VERIFY = '/contributor-verify';
export const CONTRIBUTOR_DASHBOARD = CONTRIBUTOR_ENTRY + '/contributions';
