import React from 'react';
import * as S from './DashboardSidebar.styled';
import ContentSectionNav from './navs/ContentSectionNav';
import ContributionSectionNav from './navs/ContributionSectionNav';

import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import hasContributionsDashboardAccessToUser from 'utilities/hasContributionsDashboardAccessToUser';
import DashboardSidebarFooter from './DashboardSidebarFooter';
import useFeatureFlags from 'hooks/useFeatureFlags';

function DashboardSidebar() {
  const { flags } = useFeatureFlags();
  const hasContributionsSectionAccess = hasContributionsDashboardAccessToUser(flags);
  const hasContentSectionAccess = flagIsActiveForUser(CONTENT_SECTION_ACCESS_FLAG_NAME, flags);
  return (
    <S.DashboardSidebar>
      <S.NavList role="list" data-testid="nav-list" aria-labelledby="sidebar-label-id">
        {hasContentSectionAccess ? <ContentSectionNav /> : null}
        {hasContributionsSectionAccess ? <ContributionSectionNav /> : null}
      </S.NavList>
      <DashboardSidebarFooter />
    </S.DashboardSidebar>
  );
}

export default DashboardSidebar;
