import HeaderSection from 'components/common/HeaderSection';
import SettingsSection from 'components/common/SettingsSection';
import { PricingLink, Wrapper } from './Subscription.styled';
import { Link } from 'components/base';
import { HELP_URL, PRICING_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import SubscriptionPlan from './SubscriptionPlan';
import { PLAN_LABELS } from 'constants/orgPlanConstants';

export function Subscription() {
  const { user } = useUser();

  if (!user) {
    return null;
  }

  const firstOrg = user.organizations[0];

  return (
    <Wrapper>
      <HeaderSection title="Settings" />
      <SettingsSection title="Subscription" subtitle="View and manage your plan." />
      <SettingsSection hideBottomDivider title="Current Plan" />
      <SubscriptionPlan plan={firstOrg.plan.name} />
      <PricingLink href={PRICING_URL} target="_blank">
        View full pricing comparison
      </PricingLink>
      {firstOrg.plan.name !== PLAN_LABELS.FREE && (
        <>
          <SettingsSection hideBottomDivider title="Downgrade or Cancel" />
          <p>
            To downgrade or cancel your plan, contact{' '}
            <Link href={HELP_URL} target="_blank">
              Support
            </Link>
            .
          </p>
        </>
      )}
    </Wrapper>
  );
}

export default Subscription;
