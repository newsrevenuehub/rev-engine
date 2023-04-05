import { ICONS } from 'assets/icons/SvgIcon';
import { CONTENT_SLUG, CUSTOMIZE_SLUG } from 'routes';
import { NavItem, NavItemIcon, NavSection, SectionLabel, SideBarText } from '../DashboardSidebar.styled';

function ContentSectionNav() {
  return (
    <NavSection aria-labelledby="content-section-id">
      <SectionLabel id="content-section-id">Content</SectionLabel>
      <NavItem aria-labelledby="pages-nav-item-id" role="listitem" data-testid="nav-pages-item" to={CONTENT_SLUG}>
        <NavItemIcon icon={ICONS.PAGES} />
        <SideBarText id="pages-nav-item-id">Pages</SideBarText>
      </NavItem>
      <NavItem
        aria-labelledby="customize-nav-item-id"
        role="listitem"
        data-testid="nav-styles-item"
        to={CUSTOMIZE_SLUG}
      >
        <NavItemIcon icon={ICONS.CUSTOMIZE} />
        <SideBarText id="customize-nav-item-id">Customize</SideBarText>
      </NavItem>
    </NavSection>
  );
}

export default ContentSectionNav;
