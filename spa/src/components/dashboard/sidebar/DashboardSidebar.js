import React from 'react';
import * as S from './DashboardSidebar.styled';
import ContentSectionNav from './navs/ContentSectionNav';
import ContributionSectionNav from './navs/ContributionSectionNav';

import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import { useFeatureFlagsProviderContext } from 'components/Main';
import hasContributionsDashboardAcessToUser from 'utilities/hasContributionsDashboardAccessToUser';

/*
// Commenting out for now as this will needed in future
// import { ICONS } from 'assets/icons/SvgIcon';

function DashboardMain() {
  return (
    <S.NavItemLabel>
      <S.NavItemIcon icon={ICONS.DASHBOARD} />
      <S.SideBarText id="sidebar-label-id">Dashboard</S.SideBarText>
    </S.NavItemLabel>
  );
}
*/

function DashboardSidebar() {
  const { featureFlags } = useFeatureFlagsProviderContext();

  const hasContributionsSectionAccess = hasContributionsDashboardAcessToUser(featureFlags);
  const hasContentSectionAccess = flagIsActiveForUser(CONTENT_SECTION_ACCESS_FLAG_NAME, featureFlags);

  return (
    <S.DashboardSidebar>
      <S.NavList role="list" data-testid="nav-list" aria-labelledby="sidebar-label-id">
        {hasContentSectionAccess ? <ContentSectionNav /> : null}
        {hasContributionsSectionAccess ? <ContributionSectionNav /> : null}
      </S.NavList>
    </S.DashboardSidebar>
  );
}

export default DashboardSidebar;
