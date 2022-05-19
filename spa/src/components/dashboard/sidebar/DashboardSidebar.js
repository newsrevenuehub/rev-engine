import * as S from './DashboardSidebar.styled';
import { DONATIONS_SLUG, CONTENT_SLUG } from 'routes';
import { ICONS } from 'assets/icons/SvgIcon';

import logout from 'components/authentication/logout';
import { CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import useFeatureFlags from 'hooks/useFeatureFlags';

function DashboardSidebar({ shouldAllowDashboard }) {
  const userFlags = useFeatureFlags();
  const hasContributionsSectionAccess =
    userFlags && userFlags.length && flagIsActiveForUser(CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME, userFlags);

  const handleClick = (e) => {
    if (!shouldAllowDashboard) e.preventDefault();
  };

  return (
    <S.DashboardSidebar>
      <S.NavList>
        <S.NavItem to={CONTENT_SLUG} onClick={handleClick} disabled={!shouldAllowDashboard}>
          Content
        </S.NavItem>
        {hasContributionsSectionAccess && (
          <S.NavItem to={DONATIONS_SLUG} onClick={handleClick} disabled={!shouldAllowDashboard}>
            Contributions
          </S.NavItem>
        )}
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
