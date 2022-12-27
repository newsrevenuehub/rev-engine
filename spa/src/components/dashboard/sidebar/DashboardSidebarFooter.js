import * as S from './DashboardSidebar.styled';
import { ICONS } from 'assets/icons/SvgIcon';
import HelpOutlined from '@material-ui/icons/HelpOutline';
import { FAQ_URL, HELP_URL } from 'constants/helperUrls';

const DashboardSidebarFooter = () => (
  <S.NavSection>
    <S.NavItem
      aria-labelledby="help-nav-item-id"
      as="a"
      href={HELP_URL}
      role="listitem"
      data-testid="nav-help-item"
      rel="noopener noreferrer"
      target="_blank"
    >
      <S.NavItemIcon icon={ICONS.RING_BUOY} />
      <S.SideBarText id="help-nav-item-id">Help</S.SideBarText>
    </S.NavItem>
    <S.NavItem
      aria-labelledby="faq-nav-item-id"
      as="a"
      href={FAQ_URL}
      role="listitem"
      data-testid="nav-faq-item"
      rel="noopener noreferrer"
      target="_blank"
    >
      <S.NavItemMaterialIcon>
        <HelpOutlined />
      </S.NavItemMaterialIcon>
      <S.SideBarText id="faq-nav-item-id" viewBox="0 0 16 16">
        FAQ
      </S.SideBarText>
    </S.NavItem>
  </S.NavSection>
);

export default DashboardSidebarFooter;
