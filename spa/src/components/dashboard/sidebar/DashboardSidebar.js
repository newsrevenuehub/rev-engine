import React from 'react';
import * as S from './DashboardSidebar.styled';
import { DONATIONS_SLUG, CONTENT_SLUG, CUSTOMIZE_SLUG } from 'routes';
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

  const handleClick = (e) => {
    if (!shouldAllowDashboard) e.preventDefault();
  };

  return (
    <S.DashboardSidebar>
      <S.NavList role="list" data-testid="nav-list" aria-labelledby="sidebar-label-id">
        <S.NavItemLabel>
          <S.NavItemIcon icon={ICONS.DASHBOARD} />
          <S.SideBarText id="sidebar-label-id">Dashboard</S.SideBarText>
        </S.NavItemLabel>

        {hasContentSectionAccess ? (
          <S.NavSection aria-labelledby="content-section-id">
            <S.Divider />
            <S.SectionLabel id="content-section-id">Content</S.SectionLabel>
            <S.NavItem
              aria-labelledby="pages-nav-item-id"
              role="listitem"
              data-testid="nav-content-item"
              to={CONTENT_SLUG}
              onClick={handleClick}
              disabled={!shouldAllowDashboard}
            >
              <S.NavItemIcon icon={ICONS.PAGES} />
              <S.SideBarText id="pages-nav-item-id">Pages</S.SideBarText>
            </S.NavItem>
            <S.NavItem
              aria-labelledby="customize-nav-item-id"
              role="listitem"
              data-testid="nav-content-item"
              to={CUSTOMIZE_SLUG}
              onClick={handleClick}
              disabled={!shouldAllowDashboard}
            >
              <S.NavItemIcon icon={ICONS.CUSTOMIZE} />
              <S.SideBarText id="customize-nav-item-id">Customize</S.SideBarText>
            </S.NavItem>
          </S.NavSection>
        ) : null}

        {hasContributionsSectionAccess ? (
          <S.NavSection aria-labelledby="activity-section-id">
            <S.Divider />
            <S.SectionLabel id="activity-section-id">Activity</S.SectionLabel>
            <S.NavItem
              aria-labelledby="contributions-nav-item-id"
              role="listitem"
              data-testid="nav-contributions-item"
              to={DONATIONS_SLUG}
              onClick={handleClick}
              disabled={!shouldAllowDashboard}
            >
              <S.NavItemIcon icon={ICONS.CONTRIBUTIONS} />
              <S.SideBarText id="contributions-nav-item-id">Contributions</S.SideBarText>
            </S.NavItem>
          </S.NavSection>
        ) : null}
      </S.NavList>
    </S.DashboardSidebar>
  );
}

export default DashboardSidebar;
