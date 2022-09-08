import {
  CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME,
  CONTRIBUTIONS_SECTION_DENY_FLAG_NAME
} from 'constants/featureFlagConstants';
import getDomain from './getDomain';

import hasContributionsDashboardAccessToUser from './hasContributionsDashboardAccessToUser';

describe('Test hasContributionsDashboardAccessToUser utility function', () => {
  const contributionsSectionAccessFlag = {
    id: '1234',
    name: CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME
  };
  const contributionsSectionDenyFlag = {
    id: '1234',
    name: CONTRIBUTIONS_SECTION_DENY_FLAG_NAME
  };

  it('should return FALSE when CONTRIBUTIONS_SECTION_DENY_FLAG_NAME is set irrespective of CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME', () => {
    expect(hasContributionsDashboardAccessToUser([contributionsSectionDenyFlag])).toBe(false);
    expect(hasContributionsDashboardAccessToUser([contributionsSectionDenyFlag, contributionsSectionAccessFlag])).toBe(
      false
    );
  });

  it('should return TRUE when CONTRIBUTIONS_SECTION_DENY_FLAG_NAME is not set and CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME is set', () => {
    expect(hasContributionsDashboardAccessToUser([contributionsSectionAccessFlag])).toBe(true);
  });
});

const urlList = [
  { host: 'domain.com', domain: 'domain.com' },
  { host: 'subdomain.domain.com', domain: 'domain.com' },
  { host: 'subdomain.domain.co.uk', domain: 'domain.co.uk' }
  // TODO: solve limitation of function getDomain / getSubdomain.
  // Fails when testing for:
  // { host: 'domain.co.uk', domain: 'domain.co.uk' },
];

describe('Test getDomain', () => {
  urlList.map((url) =>
    it(`test: ${url.host}`, () => {
      const domain = getDomain(url.host);
      expect(domain).toEqual(url.domain);
    })
  );
});
