import * as S from './DashboardSidebar.styled';
import { DONATIONS_SLUG, CONTENT_SLUG, MAIN_CONTENT_SLUG, ORGANIZATION_SLUG } from 'routes';
import { ICONS } from 'assets/icons/SvgIcon';

// Hooks
import useUser from 'hooks/useUser';

// Util
import logout from 'components/authentication/logout';

function DashboardSidebar({ shouldAllowDashboard }) {
  const user = useUser();

  const handleClick = (e) => {
    if (!shouldAllowDashboard) e.preventDefault();
  };

  return (
    <S.DashboardSidebar>
      <S.NavList>
        {/* <S.NavItem exact to={MAIN_CONTENT_SLUG} onClick={handleClick} disabled={!shouldAllowDashboard}>
          Overview
        </S.NavItem> */}
        <S.NavItem to={CONTENT_SLUG} onClick={handleClick} disabled={!shouldAllowDashboard}>
          Content
        </S.NavItem>
        <S.NavItem to={DONATIONS_SLUG} onClick={handleClick} disabled={!shouldAllowDashboard}>
          Donations
        </S.NavItem>
        <S.NavItem to={ORGANIZATION_SLUG} onClick={handleClick} disabled={!shouldAllowDashboard}>
          {user?.organization?.name}
        </S.NavItem>
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
