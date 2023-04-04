import HelpOutlined from '@material-ui/icons/HelpOutline';
import { LS_SIDEBAR_CORE_UPGRADE_CLOSED } from 'appSettings';
import { ICONS } from 'assets/icons/SvgIcon';
import { FAQ_URL, HELP_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import { useState } from 'react';
import { getUserRole } from 'utilities/getUserRole';
import { CoreUpgradePrompt } from './CoreUpgradePrompt';
import { NavItem, NavItemIcon, NavItemMaterialIcon, NavList, NavSection, SideBarText } from './DashboardSidebar.styled';

const DashboardSidebarFooter = () => {
  const { user } = useUser();
  const { isOrgAdmin } = getUserRole(user);
  const [coreUpgradePromptClosed, setCoreUpgradePromptClosed] = useState(false);
  const showCoreUpgradePrompt =
    !coreUpgradePromptClosed &&
    isOrgAdmin &&
    user?.organizations[0].plan.name === 'FREE' &&
    user?.revenue_programs[0].payment_provider_stripe_verified &&
    window.localStorage.getItem(LS_SIDEBAR_CORE_UPGRADE_CLOSED) === null;

  function handleCoreUpgradePromptClose() {
    // Close it now.
    setCoreUpgradePromptClosed(true);

    // Remember for our user session.
    // This is reset in components/authentication/logout.ts.

    window.localStorage.setItem(LS_SIDEBAR_CORE_UPGRADE_CLOSED, 'true');
  }

  return (
    <NavSection>
      {showCoreUpgradePrompt && <CoreUpgradePrompt onClose={handleCoreUpgradePromptClose} />}
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
