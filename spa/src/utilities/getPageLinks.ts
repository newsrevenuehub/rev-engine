import { ContributionPage } from 'hooks/useContributionPage';
import urlJoin from 'url-join';
import { getRevenueProgramDomain } from './getRevenueProgramDomain';
import { PORTAL } from 'routes';

export const pageLink = (page: ContributionPage) =>
  urlJoin(getRevenueProgramDomain(page.revenue_program), page.slug ?? '');

export const portalLink = (page: ContributionPage) =>
  urlJoin(getRevenueProgramDomain(page.revenue_program), PORTAL.ENTRY.replaceAll('/', ''));
