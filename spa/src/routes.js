export const LOGIN = '/login';
export const DASHBOARD_SLUG = '/dashboard';
export const ORGANIZATION_SLUG = DASHBOARD_SLUG + '/organization';
export const DONATIONS_SLUG = DASHBOARD_SLUG + '/donations';
export const CONTENT_SLUG = DASHBOARD_SLUG + '/content';
export const CONNECT_SLUG = DASHBOARD_SLUG + '/connect';

export const EDITOR_ROUTE = '/edit';
export const EDITOR_ROUTE_REV = EDITOR_ROUTE + '/:revProgramSlug';
export const EDITOR_ROUTE_PAGE = EDITOR_ROUTE + '/:revProgramSlug/:pageSlug';
export const DONATION_PAGE_SLUG = '/:pageSlug';
export const THANK_YOU_SLUG = '/thank-you';

// Contributor
export const CONTRIBUTOR_ENTRY = '/contributor';
export const CONTRIBUTOR_VERIFY = '/contributor-verify';
export const CONTRIBUTOR_DASHBOARD = CONTRIBUTOR_ENTRY + '/contributions';
