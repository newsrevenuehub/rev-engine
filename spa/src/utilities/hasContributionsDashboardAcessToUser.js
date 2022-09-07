import {
  CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME,
  CONTRIBUTIONS_SECTION_DENY_FLAG_NAME
} from 'constants/featureFlagConstants';
import flagIsActiveForUser from './flagIsActiveForUser';

function hasContributionsDashboardAcessToUser(featureFlags) {
  const disableContributionAccessFlag = flagIsActiveForUser(CONTRIBUTIONS_SECTION_DENY_FLAG_NAME, featureFlags);
  const enableContributionAccessFlag = flagIsActiveForUser(CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME, featureFlags);

  return !disableContributionAccessFlag && enableContributionAccessFlag;
}

export default hasContributionsDashboardAcessToUser;
