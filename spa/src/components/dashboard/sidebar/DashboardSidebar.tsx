import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import useUser from 'hooks/useUser';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import hasContributionsDashboardAccessToUser from 'utilities/hasContributionsDashboardAccessToUser';
import useFeatureFlags from 'hooks/useFeatureFlags';
import ContentSectionNav from './navs/ContentSectionNav';
import ContributionSectionNav from './navs/ContributionSectionNav';
import DashboardSidebarFooter from './DashboardSidebarFooter';
import { Banner, Content, Logo, NavList, PlanBadgeContainer, Root } from './DashboardSidebar.styled';
import OrganizationMenu from 'components/common/OrganizationMenu';
import EnginePlanBadge from 'components/common/EnginePlanBadge/EnginePlanBadge';
import { getUserRole } from 'utilities/getUserRole';

function DashboardSidebar() {
  const { user } = useUser();
  const { isHubAdmin } = getUserRole(user);
  const { flags } = useFeatureFlags();
  const hasContributionsSectionAccess = hasContributionsDashboardAccessToUser(flags);
  const hasContentSectionAccess = flagIsActiveForUser(CONTENT_SECTION_ACCESS_FLAG_NAME, flags);
  const currentOrg = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  return (
    <Root>
      <Banner>
        <Logo aria-label="News Revenue Engine" role="img" />
        {!isHubAdmin && currentOrg && (
          <PlanBadgeContainer data-testid="engine-plan-badge">
            <EnginePlanBadge plan={currentOrg.plan.name} />
          </PlanBadgeContainer>
        )}
      </Banner>
      <Content>
        <NavList role="list" data-testid="nav-list" aria-labelledby="sidebar-label-id">
          {currentOrg?.name && <OrganizationMenu title={currentOrg.name} />}
          {hasContentSectionAccess && <ContentSectionNav />}
          {hasContributionsSectionAccess && <ContributionSectionNav />}
        </NavList>
        <DashboardSidebarFooter />
      </Content>
    </Root>
  );
}

export default DashboardSidebar;
