import HelpOutlined from '@material-ui/icons/HelpOutline';
import { ICONS } from 'assets/icons/SvgIcon';
import { FAQ_URL, HELP_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import { getUserRole } from 'utilities/getUserRole';
import { SidebarUpgradePrompt } from './SidebarUpgradePrompt';
import { NavItem, NavItemIcon, NavItemMaterialIcon, NavList, NavSection, SideBarText } from './DashboardSidebar.styled';
import {
  SIDEBAR_CONSULTING_UPGRADE_CLOSED,
  SIDEBAR_CORE_UPGRADE_CLOSED,
  SIDEBAR_PLUS_UPGRADE_CLOSED,
  useSessionState
} from 'hooks/useSessionState';
import { useCallback, useMemo } from 'react';
import { PLAN_NAMES } from 'constants/orgPlanConstants';

const DashboardSidebarFooter = () => {
  const { user } = useUser();
  const { isOrgAdmin } = getUserRole(user);
  const [coreUpgradePromptClosed, setCoreUpgradePromptClosed] = useSessionState(SIDEBAR_CORE_UPGRADE_CLOSED, false);
  const [plusUpgradePromptClosed, setPlusUpgradePromptClosed] = useSessionState(SIDEBAR_PLUS_UPGRADE_CLOSED, false);
  const [consultingUpgradePromptClosed, setConsultingUpgradePromptClosed] = useSessionState(
    SIDEBAR_CONSULTING_UPGRADE_CLOSED,
    false
  );

  const showUpgradePrompt = useMemo(() => {
    // Doesn't show any prompts if plan is undefined
    if (!user?.organizations[0]?.plan?.name) {
      return false;
    }

    const isAdminAndStripeVerified = isOrgAdmin && user?.revenue_programs[0].payment_provider_stripe_verified;

    if (user?.organizations[0].plan.name === PLAN_NAMES.FREE) {
      return !coreUpgradePromptClosed && isAdminAndStripeVerified;
    }

    if (user?.organizations[0].plan.name === PLAN_NAMES.CORE) {
      return !plusUpgradePromptClosed && isAdminAndStripeVerified;
    }

    if (user?.organizations[0].plan.name === PLAN_NAMES.PLUS) {
      return !consultingUpgradePromptClosed && isAdminAndStripeVerified;
    }

    return false;
  }, [
    consultingUpgradePromptClosed,
    coreUpgradePromptClosed,
    isOrgAdmin,
    plusUpgradePromptClosed,
    user?.organizations,
    user?.revenue_programs
  ]);

  console.log({ showUpgradePrompt, user });

  const onClosePrompt = useCallback(() => {
    if (user?.organizations[0].plan.name === PLAN_NAMES.PLUS) {
      return setConsultingUpgradePromptClosed(true);
    }

    if (user?.organizations[0].plan.name === PLAN_NAMES.CORE) {
      return setPlusUpgradePromptClosed(true);
    }

    return setCoreUpgradePromptClosed(true);
  }, [setConsultingUpgradePromptClosed, setCoreUpgradePromptClosed, setPlusUpgradePromptClosed, user?.organizations]);

  return (
    <NavSection>
      {showUpgradePrompt && (
        <SidebarUpgradePrompt onClose={onClosePrompt} currentPlan={user!.organizations[0].plan.name} />
      )}
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
