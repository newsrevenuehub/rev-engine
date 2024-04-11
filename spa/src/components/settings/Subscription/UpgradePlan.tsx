import { STRIPE_SELF_UPGRADE_PRICING_TABLE_ID, STRIPE_SELF_UPGRADE_PRICING_TABLE_PUBLISHABLE_KEY } from 'appSettings';
import { Link } from 'components/base';
import SettingsSection from 'components/common/SettingsSection';
import { StripePricingTable } from 'components/common/StripePricingTable';
import { PRICING_URL } from 'constants/helperUrls';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import { Organization, User } from 'hooks/useUser.types';
import PropTypes, { InferProps } from 'prop-types';
import { PricingTableContainer } from './UpgradePlan.styled';

const UpgradePlanPropTypes = {
  organization: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired
};

export interface UpgradePlanProps extends InferProps<typeof UpgradePlanPropTypes> {
  organization: Organization;
  user: User;
}

export function UpgradePlan({ organization, user }: UpgradePlanProps) {
  if (organization.plan.name === PLAN_NAMES.PLUS) {
    return null;
  }

  return (
    <SettingsSection
      hideBottomDivider
      orientation="vertical"
      title="Upgrade Plan"
      subtitle="Increase your customization and insights by upgrading."
    >
      {organization.plan.name === PLAN_NAMES.FREE &&
        STRIPE_SELF_UPGRADE_PRICING_TABLE_ID &&
        STRIPE_SELF_UPGRADE_PRICING_TABLE_PUBLISHABLE_KEY && (
          <PricingTableContainer>
            <StripePricingTable
              clientReferenceId={organization.uuid}
              customerEmail={user.email}
              pricingTableId={STRIPE_SELF_UPGRADE_PRICING_TABLE_ID}
              publishableKey={STRIPE_SELF_UPGRADE_PRICING_TABLE_PUBLISHABLE_KEY}
            />
          </PricingTableContainer>
        )}
      <Link href={PRICING_URL} target="_blank">
        View full pricing comparison
      </Link>
    </SettingsSection>
  );
}

UpgradePlan.propTypes = UpgradePlanPropTypes;
export default UpgradePlan;
