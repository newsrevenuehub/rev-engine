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
        <S.NavItemLabel
          data-testid="nav-content-item"
          to={CONTENT_SLUG}
          onClick={handleClick}
          disabled={!shouldAllowDashboard}
        >
          <S.NavItemIcon icon={ICONS.DASHBOARD} />
          <S.SideBarText>Dashboard</S.SideBarText>
        </S.NavItemLabel>

        <S.Divider />
        {hasContentSectionAccess ? <S.SectionLabel>Content</S.SectionLabel> : null}

        {hasContentSectionAccess ? (
          <S.NavItem
            data-testid="nav-content-item"
            to={CONTENT_SLUG}
            onClick={handleClick}
            disabled={!shouldAllowDashboard}
          >
            <S.NavItemIcon icon={ICONS.PAGES} />
            <S.SideBarText>Pages</S.SideBarText>
          </S.NavItem>
        ) : null}
        {hasContentSectionAccess ? (
          <S.NavItem
            data-testid="nav-content-item"
            to={CUSTOMIZE_SLUG}
            onClick={handleClick}
            disabled={!shouldAllowDashboard}
          >
            <S.NavItemIcon icon={ICONS.CUSTOMIZE} />
            <S.SideBarText>Customize</S.SideBarText>
          </S.NavItem>
        ) : null}

        {hasContributionsSectionAccess ? <S.Divider /> : null}
        {hasContributionsSectionAccess ? <S.SectionLabel>Activity</S.SectionLabel> : null}

        {hasContributionsSectionAccess ? (
          <S.NavItem
            data-testid="nav-contributions-item"
            to={DONATIONS_SLUG}
            onClick={handleClick}
            disabled={!shouldAllowDashboard}
          >
            <S.NavItemIcon icon={ICONS.CONTRIBUTIONS} />
            <S.SideBarText>Contributions</S.SideBarText>
          </S.NavItem>
        ) : null}
      </S.NavList>
      <S.OtherContent>
        <S.Logout onClick={logout} whileHover={{ scale: 1.05, x: -3 }} whileTap={{ scale: 1, x: 0 }}>
          <S.LogoutIcon icon={ICONS.LOGOUT} />
          Sign out
        </S.Logout>
      </S.OtherContent>
    </S.DashboardSidebar>
  );
}

export default DashboardSidebar;
