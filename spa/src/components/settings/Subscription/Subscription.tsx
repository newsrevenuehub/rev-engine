import { Link } from 'components/base';
import HeaderSection from 'components/common/HeaderSection';
import SettingsSection from 'components/common/SettingsSection';
import { HELP_URL, PRICING_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import SubscriptionPlan from './SubscriptionPlan';
import { Downgrade, PricingLink, SubscriptionPlanContainer, Wrapper } from './Subscription.styled';

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
      <SubscriptionPlanContainer>
        <SubscriptionPlan plan={firstOrg.plan.name} />
      </SubscriptionPlanContainer>
      <SettingsSection
        hideBottomDivider
        title="Upgrade Plan"
        subtitle="Increase your customization and insights by upgrading."
      />
      <PricingLink href={PRICING_URL} target="_blank">
        View full pricing comparison
      </PricingLink>
      <SettingsSection hideBottomDivider title="Downgrade or Cancel" />
      <Downgrade>
        To downgrade or cancel your plan, contact{' '}
        <Link href={HELP_URL} target="_blank">
          Support
        </Link>
        .
      </Downgrade>
    </Wrapper>
  );
}

export default Subscription;
