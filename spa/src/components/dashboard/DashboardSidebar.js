import * as S from './DashboardSidebar.styled';
import { DONATIONS_SLUG, CONTENT_SLUG, DASHBOARD_SLUG } from 'routes';

// Context
import { useOrganizationContext } from 'components/Main';

function DashboardSidebar() {
  const { defaultPaymentProvider } = useOrganizationContext();

  const handleClick = (e) => {
    if (!defaultPaymentProvider) e.preventDefault();
  };

  return (
    <S.DashboardSidebar>
      <S.NavList>
        <S.NavItem exact to={DASHBOARD_SLUG} onClick={handleClick} disabled={!defaultPaymentProvider}>
          Overview
        </S.NavItem>
        <S.NavItem to={DONATIONS_SLUG} onClick={handleClick} disabled={!defaultPaymentProvider}>
          Donations
        </S.NavItem>
        <S.NavItem to={CONTENT_SLUG} onClick={handleClick} disabled={!defaultPaymentProvider}>
          Content
        </S.NavItem>
      </S.NavList>
    </S.DashboardSidebar>
  );
}

export default DashboardSidebar;
