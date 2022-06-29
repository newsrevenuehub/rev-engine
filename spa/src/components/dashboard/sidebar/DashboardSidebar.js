import React from 'react';
import * as S from './DashboardSidebar.styled';
import ContentSectionNav from './navs/ContentSectionNav';
import ContributionSectionNav from './navs/ContributionSectionNav';
import { ICONS } from 'assets/icons/SvgIcon';

import {
  CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME,
  CONTENT_SECTION_ACCESS_FLAG_NAME
} from 'constants/featureFlagConstants';

import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import { useFeatureFlagsProviderContext } from 'components/Main';

function DashboardSidebar({ shouldAllowDashboard }) {
  const { featureFlags } = useFeatureFlagsProviderContext();

  const hasContributionsSectionAccess = flagIsActiveForUser(CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME, featureFlags);
  const hasContentSectionAccess = flagIsActiveForUser(CONTENT_SECTION_ACCESS_FLAG_NAME, featureFlags);

  return (
    <S.DashboardSidebar>
      <S.NavList role="list" data-testid="nav-list" aria-labelledby="sidebar-label-id">
        <S.NavItemLabel>
          <S.NavItemIcon icon={ICONS.DASHBOARD} />
          <S.SideBarText id="sidebar-label-id">Dashboard</S.SideBarText>
        </S.NavItemLabel>

        <ContentSectionNav
          hasContentSectionAccess={hasContentSectionAccess}
          shouldAllowDashboard={shouldAllowDashboard}
        />
        <ContributionSectionNav
          hasContributionsSectionAccess={hasContributionsSectionAccess}
          shouldAllowDashboard={shouldAllowDashboard}
        />
      </S.NavList>
    </S.DashboardSidebar>
  );
}

export default DashboardSidebar;
