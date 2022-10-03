import getDomain from './getDomain';

export const pageLink = (page) => `${page?.revenue_program?.slug}.${getDomain(window.location.host)}/${page?.slug}`;
export const portalLink = (page) => `${page?.revenue_program?.slug}.${getDomain(window.location.host)}/contributor`;
