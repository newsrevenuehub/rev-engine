import * as S from './DashboardSidebar.styled';
import { ICONS } from 'assets/icons/SvgIcon';
import HelpOutlined from '@material-ui/icons/HelpOutline';

// Exported mainly to help with unit tests.
export const footerHrefs = {
  faq: 'https://news-revenue-hub.atlassian.net/servicedesk/customer/portal/11/article/2195423496',
  help: 'mailto:revengine-support@fundjournalism.org'
};

const DashboardSidebarFooter = () => (
  <S.NavSection>
    <S.NavItem
      aria-labelledby="help-nav-item-id"
      as="a"
      href={footerHrefs.help}
      role="listitem"
      data-testid="nav-help-item"
    >
      <S.NavItemIcon icon={ICONS.RING_BUOY} />
      <S.SideBarText id="help-nav-item-id">Help</S.SideBarText>
    </S.NavItem>
    <S.NavItem
      aria-labelledby="faq-nav-item-id"
      as="a"
      href={footerHrefs.faq}
      role="listitem"
      data-testid="nav-faq-item"
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
