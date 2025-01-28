import HelpOutlined from '@material-ui/icons/HelpOutline';
import RingBuoy from 'assets/icons/ring-buoy.svg?react';
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
    // Don't show any prompts if plan is loading, the user isn't an org admin,
    // or they haven't verified Stripe yet.
    if (
      !user?.organizations[0]?.plan?.name ||
      !isOrgAdmin ||
      !user?.revenue_programs[0]?.payment_provider_stripe_verified
    ) {
      return false;
    }

    switch (user?.organizations[0].plan.name) {
      case PLAN_NAMES.FREE:
        return !coreUpgradePromptClosed;
      case PLAN_NAMES.CORE:
        return !plusUpgradePromptClosed;
      case PLAN_NAMES.PLUS:
        return !consultingUpgradePromptClosed;
    }

    // Should never happen. Log it to Sentry but show no prompt.
    console.warn(`Unexpected plan name: ${user?.organizations[0].plan.name}`);
    return false;
  }, [
    consultingUpgradePromptClosed,
    coreUpgradePromptClosed,
    isOrgAdmin,
    plusUpgradePromptClosed,
    user?.organizations,
    user?.revenue_programs
  ]);

  const onClosePrompt = useCallback(() => {
    switch (user?.organizations[0].plan.name) {
      case PLAN_NAMES.FREE:
        return setCoreUpgradePromptClosed(true);
      case PLAN_NAMES.CORE:
        return setPlusUpgradePromptClosed(true);
      case PLAN_NAMES.PLUS:
        return setConsultingUpgradePromptClosed(true);
    }

    // Should never happen.
    throw new Error(`Unexpected plan name: ${user?.organizations[0].plan.name}`);
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
          <NavItemIcon>
            <RingBuoy />
          </NavItemIcon>
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
