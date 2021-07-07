export const LOGIN = '/login';
export const MAIN_CONTENT_SLUG = '/dashboard';
export const ORGANIZATION_SLUG = MAIN_CONTENT_SLUG + '/organization';
export const DONATIONS_SLUG = MAIN_CONTENT_SLUG + '/donations';
export const PAGES_SLUG = MAIN_CONTENT_SLUG + '/pages';

export const EDITOR_ROUTE = '/edit';
export const EDITOR_ROUTE_REV = EDITOR_ROUTE + '/:revProgramSlug';
export const EDITOR_ROUTE_PAGE = EDITOR_ROUTE + '/:revProgramSlug/:pageSlug';
export const REV_PROGRAM_SLUG = '/:revProgramSlug';
export const DONATION_PAGE_SLUG = '/:revProgramSlug/:pageSlug';
export const THANK_YOU_SLUG = '/thank-you';

export const REV_PROGRAM_CREATE_SLUG = '/this-is-a-placeholder';

// Contributor
export const CONTRIBUTOR_ENTRY = '/contributor';
export const CONTRIBUTOR_VERIFY = '/contributor-verify';
export const CONTRIBUTOR_DASHBOARD = CONTRIBUTOR_ENTRY + '/contributions';
