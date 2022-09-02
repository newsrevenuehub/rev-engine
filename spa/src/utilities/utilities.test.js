import {
  CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME,
  CONTRIBUTIONS_SECTION_DENY_FLAG_NAME
} from 'constants/featureFlagConstants';

import hasContributionsDashboardAcessToUser from './hasContributionsDashboardAcessToUser';

describe('Test hasContributionsDasbhoardAccessToUser utility function', () => {
  const contributionsSectionAccessFlag = {
    id: '1234',
    name: CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME
  };
  const contributionsSectionDenyFlag = {
    id: '1234',
    name: CONTRIBUTIONS_SECTION_DENY_FLAG_NAME
  };

  it('should return FALSE when CONTRIBUTIONS_SECTION_DENY_FLAG_NAME is set irrespective of CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME', () => {
    expect(hasContributionsDashboardAcessToUser([contributionsSectionDenyFlag])).toBe(false);
    expect(hasContributionsDashboardAcessToUser([contributionsSectionDenyFlag, contributionsSectionAccessFlag])).toBe(
      false
    );
  });

  it('should return TRUE when CONTRIBUTIONS_SECTION_DENY_FLAG_NAME is not set and CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME is set', () => {
    expect(hasContributionsDashboardAcessToUser([contributionsSectionAccessFlag])).toBe(true);
  });
});
