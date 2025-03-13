import Pages from 'assets/icons/pages.svg?react';
import Email from '@material-design-icons/svg/outlined/email.svg?react';
import { CONTENT_SLUG, CONTRIBUTOR_PORTAL_SLUG, EMAILS_SLUG } from 'routes';
import {
  NavItem,
  NavSection,
  SectionLabel,
  SideBarText,
  ManageAccountIcon,
  NavItemIcon
} from '../DashboardSidebar.styled';
import useUser from 'hooks/useUser';
import { getUserRole } from 'utilities/getUserRole';

function ContentSectionNav() {
  const { user } = useUser();
  const { isOrgAdmin, isRPAdmin } = getUserRole(user);

  return (
    <NavSection aria-labelledby="content-section-id">
      <SectionLabel id="content-section-id">Content</SectionLabel>
      <NavItem aria-labelledby="pages-nav-item-id" role="listitem" data-testid="nav-pages-item" to={CONTENT_SLUG}>
        <NavItemIcon>
          <Pages />
        </NavItemIcon>
        <SideBarText id="pages-nav-item-id">Pages</SideBarText>
      </NavItem>
      {(isOrgAdmin || isRPAdmin) && (
        <NavItem aria-labelledby="emails-nav-item-id" role="listitem" data-testid="nav-email-item" to={EMAILS_SLUG}>
          <NavItemIcon>
            <Email />
          </NavItemIcon>
          <SideBarText id="emails-nav-item-id">Emails</SideBarText>
        </NavItem>
      )}
      {(isOrgAdmin || isRPAdmin) && (
        <NavItem
          aria-labelledby="portal-nav-item-id"
          role="listitem"
          data-testid="nav-portal-item"
          to={CONTRIBUTOR_PORTAL_SLUG}
        >
          <ManageAccountIcon />
          <SideBarText id="portal-nav-item-id">Contributor Portal</SideBarText>
        </NavItem>
      )}
    </NavSection>
  );
}

export default ContentSectionNav;
