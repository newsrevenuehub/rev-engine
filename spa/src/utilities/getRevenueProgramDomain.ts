import { HOST_MAP } from 'appSettings';
import { RevenueProgramForContributionPage } from 'hooks/useContributionPage';
import getDomain from './getDomain';

/**
 * Returns the domain for a revenue program. Does not include protocol, like
 * `https://`, or a trailing slash. This uses mappings set in HOST_MAP but
 * otherwise falls back to the current domain.
 */
export function getRevenueProgramDomain(revenueProgram: RevenueProgramForContributionPage) {
  for (const mappedDomain in HOST_MAP) {
    if (revenueProgram.slug === HOST_MAP[mappedDomain]) {
      return mappedDomain;
    }
  }

  return `${revenueProgram.slug}.${getDomain()}`;
}
