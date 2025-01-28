import { ListOutlined } from '@material-ui/icons';
import { DONATIONS_SLUG } from 'routes';
import {
  Divider,
  NavItem,
  NavItemMaterialIcon,
  NavSection,
  SectionLabel,
  SideBarText
} from '../DashboardSidebar.styled';

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
        <NavItemMaterialIcon>
          <ListOutlined />
        </NavItemMaterialIcon>
        <SideBarText id="contributions-nav-item-id">Contributions</SideBarText>
      </NavItem>
    </NavSection>
  );
}

export default ContributionSectionNav;
