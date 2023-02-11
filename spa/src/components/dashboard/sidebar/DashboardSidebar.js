import { Content, Logo, NavList, Root } from './DashboardSidebar.styled';
import ContentSectionNav from './navs/ContentSectionNav';
import ContributionSectionNav from './navs/ContributionSectionNav';

import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

import useUser from 'hooks/useUser';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import hasContributionsDashboardAccessToUser from 'utilities/hasContributionsDashboardAccessToUser';
import DashboardSidebarFooter from './DashboardSidebarFooter';
import useFeatureFlags from 'hooks/useFeatureFlags';
import OrganizationMenu from 'components/common/OrganizationMenu';

function DashboardSidebar() {
  const { user } = useUser();
  const { flags } = useFeatureFlags();
  const hasContributionsSectionAccess = hasContributionsDashboardAccessToUser(flags);
  const hasContentSectionAccess = flagIsActiveForUser(CONTENT_SECTION_ACCESS_FLAG_NAME, flags);
  const currentOrg = user?.organizations?.length === 1 && user?.organizations?.[0];

  return (
    <Root>
      <Logo aria-label="News Revenue Engine" role="img" />
      <Content>
        <NavList role="list" data-testid="nav-list" aria-labelledby="sidebar-label-id">
          {currentOrg?.name && <OrganizationMenu title={currentOrg.name} />}
          {hasContentSectionAccess ? <ContentSectionNav /> : null}
          {hasContributionsSectionAccess ? <ContributionSectionNav /> : null}
        </NavList>
        <DashboardSidebarFooter />
      </Content>
    </Root>
  );
}

export default DashboardSidebar;
