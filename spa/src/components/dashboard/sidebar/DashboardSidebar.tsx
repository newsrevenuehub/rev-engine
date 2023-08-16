import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import useUser from 'hooks/useUser';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import hasContributionsSectionAccess from 'utilities/hasContributionsSectionAccess';
import ContentSectionNav from './navs/ContentSectionNav';
import ContributionSectionNav from './navs/ContributionSectionNav';
import DashboardSidebarFooter from './DashboardSidebarFooter';
import { BadgeContainer, Banner, Content, Logo, NavList, Root } from './DashboardSidebar.styled';
import OrganizationMenu from 'components/common/OrganizationMenu';
import AdminBadge from 'components/common/Badge/AdminBadge/AdminBadge';
import EnginePlanBadge from 'components/common/Badge/EnginePlanBadge/EnginePlanBadge';
import { getUserRole } from 'utilities/getUserRole';

function DashboardSidebar() {
  const { user } = useUser();
  const { isHubAdmin, isSuperUser } = getUserRole(user);
  const hasContentSectionAccess = user && flagIsActiveForUser(CONTENT_SECTION_ACCESS_FLAG_NAME, user);
  const currentOrg = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  return (
    <Root>
      <Banner>
        <Logo aria-label="News Revenue Engine" role="img" />
        {(isHubAdmin || isSuperUser) && (
          <BadgeContainer data-testid="admin-badge">
            <AdminBadge />
          </BadgeContainer>
        )}
        {!isHubAdmin && currentOrg && (
          <BadgeContainer data-testid="engine-plan-badge">
            <EnginePlanBadge plan={currentOrg.plan.name} />
          </BadgeContainer>
        )}
      </Banner>
      <Content>
        <NavList role="list" data-testid="nav-list" aria-labelledby="sidebar-label-id">
          {currentOrg?.name && <OrganizationMenu title={currentOrg.name} />}
          {hasContentSectionAccess && <ContentSectionNav />}
          {user && hasContributionsSectionAccess(user) && <ContributionSectionNav />}
        </NavList>
        <DashboardSidebarFooter />
      </Content>
    </Root>
  );
}

export default DashboardSidebar;
