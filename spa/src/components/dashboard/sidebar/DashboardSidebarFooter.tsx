import HelpOutlined from '@material-ui/icons/HelpOutline';
import { ICONS } from 'assets/icons/SvgIcon';
import { FAQ_URL, HELP_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import { getUserRole } from 'utilities/getUserRole';
import { SidebarCoreUpgradePrompt } from './SidebarCoreUpgradePrompt';
import { NavItem, NavItemIcon, NavItemMaterialIcon, NavList, NavSection, SideBarText } from './DashboardSidebar.styled';
import { SIDEBAR_CORE_UPGRADE_CLOSED, useSessionState } from 'hooks/useSessionState';

const DashboardSidebarFooter = () => {
  const { user } = useUser();
  const { isOrgAdmin } = getUserRole(user);
  const [coreUpgradePromptClosed, setCoreUpgradePromptClosed] = useSessionState(SIDEBAR_CORE_UPGRADE_CLOSED, false);
  const showCoreUpgradePrompt =
    !coreUpgradePromptClosed &&
    isOrgAdmin &&
    user?.organizations[0].plan.name === 'FREE' &&
    user?.revenue_programs[0].payment_provider_stripe_verified;

  return (
    <NavSection>
      {showCoreUpgradePrompt && <SidebarCoreUpgradePrompt onClose={() => setCoreUpgradePromptClosed(true)} />}
      <NavList>
        <NavItem
          aria-labelledby="help-nav-item-id"
          as="a"
          href={HELP_URL}
          role="listitem"
          data-testid="nav-help-item"
          target="_blank"
        >
          <NavItemIcon icon={ICONS.RING_BUOY} />
          <SideBarText id="help-nav-item-id">Help</SideBarText>
        </NavItem>
        <NavItem
          aria-labelledby="faq-nav-item-id"
          as="a"
          href={FAQ_URL}
          role="listitem"
          data-testid="nav-faq-item"
          target="_blank"
        >
          <NavItemMaterialIcon>
            <HelpOutlined />
          </NavItemMaterialIcon>
          <SideBarText id="faq-nav-item-id">FAQ</SideBarText>
        </NavItem>
      </NavList>
    </NavSection>
  );
};

export default DashboardSidebarFooter;
