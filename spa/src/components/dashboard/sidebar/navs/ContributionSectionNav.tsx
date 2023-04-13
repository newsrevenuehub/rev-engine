import { ICONS } from 'assets/icons/SvgIcon';
import { DONATIONS_SLUG } from 'routes';
import { Divider, NavItem, NavItemIcon, NavSection, SectionLabel, SideBarText } from '../DashboardSidebar.styled';

function ContributionSectionNav() {
  return (
    <NavSection aria-labelledby="activity-section-id">
      <Divider />
      <SectionLabel id="activity-section-id">Activity</SectionLabel>
      <NavItem
        aria-labelledby="contributions-nav-item-id"
        role="listitem"
        data-testid="nav-contributions-item"
        to={DONATIONS_SLUG}
      >
        <NavItemIcon icon={ICONS.CONTRIBUTIONS} />
        <SideBarText id="contributions-nav-item-id">Contributions</SideBarText>
      </NavItem>
    </NavSection>
  );
}

export default ContributionSectionNav;
