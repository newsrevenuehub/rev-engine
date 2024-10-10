import {
  CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME,
  CONTRIBUTIONS_SECTION_DENY_FLAG_NAME
} from 'constants/featureFlagConstants';
import hasContributionsSectionAccess from './hasContributionsSectionAccess';

const contributionsSectionAccessFlag = {
  name: CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME
};
const contributionsSectionDenyFlag = {
  name: CONTRIBUTIONS_SECTION_DENY_FLAG_NAME
};

describe('hasContributionsDashboardAccessToUser', () => {
  it('returns false when CONTRIBUTIONS_SECTION_DENY_FLAG_NAME is set irrespective of CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME', () => {
    expect(hasContributionsSectionAccess({ flags: [contributionsSectionDenyFlag], role_type: {} } as any)).toBe(false);
    expect(
      hasContributionsSectionAccess({
        flags: [contributionsSectionDenyFlag, contributionsSectionAccessFlag],
        role_type: {}
      } as any)
    ).toBe(false);
  });

  it('returns true when CONTRIBUTIONS_SECTION_DENY_FLAG_NAME is not set and CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME is set', () =>
    expect(hasContributionsSectionAccess({ flags: [contributionsSectionAccessFlag], role_type: {} } as any)).toBe(
      true
    ));

  it('returns false if the user has no role, even if they would otherwise have access', () =>
    expect(
      hasContributionsSectionAccess({ flags: [contributionsSectionAccessFlag], role_type: undefined } as any)
    ).toBe(false));

  it('returns false if user is undefined', () => expect(hasContributionsSectionAccess(undefined)).toBe(false));
});
