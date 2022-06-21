import React from 'react';
import * as S from './DashboardSidebar.styled';
import { DONATIONS_SLUG, CONTENT_SLUG, CUSTOMIZE_SLUG } from 'routes';
import { ICONS } from 'assets/icons/SvgIcon';

import logout from 'components/authentication/logout';
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
      <S.NavList data-testid="nav-list">
        <S.NavItemLabel>
          <S.NavItemIcon icon={ICONS.DASHBOARD} />
          <S.SideBarText>Dashboard</S.SideBarText>
        </S.NavItemLabel>

        {hasContentSectionAccess ? (
          <React.Fragment>
            <S.Divider />
            <S.SectionLabel>Content</S.SectionLabel>
            <S.NavItem
              data-testid="nav-content-item"
              to={CONTENT_SLUG}
              onClick={handleClick}
              disabled={!shouldAllowDashboard}
            >
              <S.NavItemIcon icon={ICONS.PAGES} />
              <S.SideBarText>Pages</S.SideBarText>
            </S.NavItem>
            <S.NavItem
              data-testid="nav-content-item"
              to={CUSTOMIZE_SLUG}
              onClick={handleClick}
              disabled={!shouldAllowDashboard}
            >
              <S.NavItemIcon icon={ICONS.CUSTOMIZE} />
              <S.SideBarText>Customize</S.SideBarText>
            </S.NavItem>
          </React.Fragment>
        ) : null}

        {hasContributionsSectionAccess ? (
          <React.Fragment>
            <S.Divider />
            <S.SectionLabel>Activity</S.SectionLabel>
            <S.NavItem
              data-testid="nav-contributions-item"
              to={DONATIONS_SLUG}
              onClick={handleClick}
              disabled={!shouldAllowDashboard}
            >
              <S.NavItemIcon icon={ICONS.CONTRIBUTIONS} />
              <S.SideBarText>Contributions</S.SideBarText>
            </S.NavItem>
          </React.Fragment>
        ) : null}
      </S.NavList>
    </S.DashboardSidebar>
  );
}

export default DashboardSidebar;
