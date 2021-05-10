import * as S from './DashboardSidebar.styled';
import { OVERVIEW_SLUG, DONATIONS_SLUG, CONTENT_SLUG } from 'routes';

// Context
import { useOrganizationContext } from './Dashboard';

function DashboardSidebar() {
  const { hasPaymentProvider } = useOrganizationContext();

  const handleClick = (e) => {
    if (!hasPaymentProvider) e.preventDefault();
  };

  return (
    <S.DashboardSidebar>
      <S.NavList>
        <S.NavItem to={OVERVIEW_SLUG} onClick={handleClick} disabled={!hasPaymentProvider}>
          Overview
        </S.NavItem>
        <S.NavItem to={DONATIONS_SLUG} onClick={handleClick} disabled={!hasPaymentProvider}>
          Donations
        </S.NavItem>
        <S.NavItem to={CONTENT_SLUG} onClick={handleClick} disabled={!hasPaymentProvider}>
          Content
        </S.NavItem>
      </S.NavList>
    </S.DashboardSidebar>
  );
}

export default DashboardSidebar;
