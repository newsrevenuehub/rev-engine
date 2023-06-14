import { Link } from 'components/base';
import HeaderSection from 'components/common/HeaderSection';
import SettingsSection from 'components/common/SettingsSection';
import { HELP_URL, PRICING_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import SubscriptionPlan from './SubscriptionPlan';
import { Downgrade, PricingLinkContainer, SubscriptionPlanContainer, Wrapper } from './Subscription.styled';
import SubheaderSection from 'components/common/SubheaderSection';

export function Subscription() {
  const { user } = useUser();
  const firstOrg = user?.organizations[0];

  if (!user || !firstOrg) {
    return null;
  }

  return (
    <Wrapper>
      <HeaderSection title="Settings" />
      <SubheaderSection title="Subscription" subtitle="View and manage your plan." />
      <SettingsSection hideBottomDivider title="Current Plan" />
      <SubscriptionPlanContainer>
        <SubscriptionPlan plan={firstOrg.plan.name} />
      </SubscriptionPlanContainer>
      <SettingsSection
        hideBottomDivider
        title="Upgrade Plan"
        subtitle="Increase your customization and insights by upgrading."
      />
      <PricingLinkContainer>
        <Link href={PRICING_URL} target="_blank">
          View full pricing comparison
        </Link>
      </PricingLinkContainer>
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
