export const LOGIN = '/login';
export const SCOPED_ROUTE = '/:orgSlug/:revProgramSlug';
export const DASHBOARD_BASE = '';
// export const DASHBOARD_SLUG = SCOPED_ROUTE + DASHBOARD_BASE;
export const DONATIONS_SLUG = DASHBOARD_BASE + SCOPED_ROUTE + '/contributions';
export const CONTENT_SLUG = DASHBOARD_BASE + SCOPED_ROUTE + '/content';
export const CONNECT_SLUG = DASHBOARD_BASE + SCOPED_ROUTE + '/connect';

export const EDITOR_ROUTE = SCOPED_ROUTE + '/edit';
// export const EDITOR_ROUTE_REV = EDITOR_ROUTE + '/:revProgramSlug';
// export const EDITOR_ROUTE_PAGE = EDITOR_ROUTE + '/:revProgramSlug/:pageSlug';
export const DONATION_PAGE_SLUG = '/:pageSlug';
export const THANK_YOU_SLUG = '/thank-you';

// Contributor
export const CONTRIBUTOR_ENTRY = '/contributor';
export const CONTRIBUTOR_VERIFY = '/contributor-verify';
export const CONTRIBUTOR_DASHBOARD = CONTRIBUTOR_ENTRY + '/contributions';
