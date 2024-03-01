import { useEffect } from 'react';
import HeaderSection from 'components/common/HeaderSection';
import { PlanChangePendingModal } from 'components/common/Modal/PlanChangePendingModal';
import SettingsSection from 'components/common/SettingsSection';
import SubheaderSection from 'components/common/SubheaderSection';
import useModal from 'hooks/useModal';
import useQueryString from 'hooks/useQueryString';
import useUser from 'hooks/useUser';
import SubscriptionPlan from './SubscriptionPlan';
import { UpgradePlan } from './UpgradePlan';
import ManageSubscription from './ManageSubscription';
import { Root } from './Subscription.styled';

export function Subscription() {
  const { user } = useUser();
  const firstOrg = user?.organizations[0];
  const { handleClose, handleOpen, open } = useModal();
  const planUpgrade = useQueryString('pendingPlanUpgrade');

  useEffect(() => {
    // If the user came back from self-upgrade, then remove the query param from
    // the URL and show the upgrade pending modal. This query param is defined
    // in the Stripe pricing table itself.

    if (planUpgrade === 'CORE') {
      const parsedUrl = new URL(window.location.href);

      parsedUrl.searchParams.delete('pendingPlanUpgrade');
      window.history.replaceState(null, '', parsedUrl.toString());
      handleOpen();
    }
  }, [handleOpen, planUpgrade]);

  if (!user || !firstOrg) {
    return null;
  }

  return (
    <Root>
      <HeaderSection title="Settings" />
      <SubheaderSection title="Subscription" subtitle="View and manage your plan." />
      <SettingsSection orientation="vertical" title="Current Plan">
        <SubscriptionPlan plan={firstOrg.plan.name} />
      </SettingsSection>
      <ManageSubscription organization={firstOrg} />
      <UpgradePlan organization={firstOrg} user={user} />
      <PlanChangePendingModal futurePlan="CORE" onClose={handleClose} open={open} />
    </Root>
  );
}

export default Subscription;
