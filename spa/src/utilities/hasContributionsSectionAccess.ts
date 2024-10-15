import {
  CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME,
  CONTRIBUTIONS_SECTION_DENY_FLAG_NAME
} from 'constants/featureFlagConstants';
import { User } from 'hooks/useUser.types';
import flagIsActiveForUser from './flagIsActiveForUser';

function hasContributionsSectionAccess(user: User) {
  // If the user has no role yet, block them.

  if (!user.role_type) {
    return false;
  }

  const disableContributionAccessFlag = flagIsActiveForUser(CONTRIBUTIONS_SECTION_DENY_FLAG_NAME, user);
  const enableContributionAccessFlag = flagIsActiveForUser(CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME, user);

  return !disableContributionAccessFlag && enableContributionAccessFlag;
}

export default hasContributionsSectionAccess;
