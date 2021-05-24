import * as S from './DashboardSidebar.styled';
import { DONATIONS_SLUG, CONTENT_SLUG, MAIN_CONTENT_SLUG } from 'routes';

function DashboardSidebar({ shouldAllowDashboard }) {
  const handleClick = (e) => {
    if (!shouldAllowDashboard) e.preventDefault();
  };

  return (
    <S.DashboardSidebar>
      <S.NavList>
        <S.NavItem exact to={MAIN_CONTENT_SLUG} onClick={handleClick} disabled={!shouldAllowDashboard}>
          Overview
        </S.NavItem>
        <S.NavItem to={DONATIONS_SLUG} onClick={handleClick} disabled={!shouldAllowDashboard}>
          Donations
        </S.NavItem>
        <S.NavItem to={CONTENT_SLUG} onClick={handleClick} disabled={!shouldAllowDashboard}>
          Content
        </S.NavItem>
      </S.NavList>
    </S.DashboardSidebar>
  );
}

export default DashboardSidebar;
