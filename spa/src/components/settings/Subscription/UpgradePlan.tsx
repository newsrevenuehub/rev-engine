import PropTypes, { InferProps } from 'prop-types';
import { STRIPE_SELF_UPGRADE_PRICING_TABLE_ID, STRIPE_SELF_UPGRADE_PRICING_TABLE_PUBLISHABLE_KEY } from 'appSettings';
import { Link, LinkButton } from 'components/base';
import SettingsSection from 'components/common/SettingsSection';
import { StripePricingTable } from 'components/common/StripePricingTable';
import { SELF_UPGRADE_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { HELP_URL, PRICING_URL } from 'constants/helperUrls';
import { PLAN_LABELS } from 'constants/orgPlanConstants';
import { Organization, User } from 'hooks/useUser.types';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import {
  NewBadge,
  PlusFeatureList,
  PlusHeader,
  PlusHeaderHighlight,
  PricingTableContainer
} from './UpgradePlan.styled';

const UpgradePlanPropTypes = {
  organization: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired
};

export interface UpgradePlanProps extends InferProps<typeof UpgradePlanPropTypes> {
  organization: Organization;
  user: User;
}

export function UpgradePlan({ organization, user }: UpgradePlanProps) {
  if (organization.plan.name === PLAN_LABELS.PLUS) {
    return null;
  }

  return (
    <SettingsSection
      hideBottomDivider
      orientation="vertical"
      title="Upgrade Plan"
      subtitle="Increase your customization and insights by upgrading."
    >
      {flagIsActiveForUser(SELF_UPGRADE_ACCESS_FLAG_NAME, user.flags) && (
        <>
          {organization.plan.name === PLAN_LABELS.FREE &&
            STRIPE_SELF_UPGRADE_PRICING_TABLE_ID &&
            STRIPE_SELF_UPGRADE_PRICING_TABLE_PUBLISHABLE_KEY && (
              <PricingTableContainer>
                <StripePricingTable
                  clientReferenceId={organization.id.toString()}
                  customerEmail={user.email}
                  pricingTableId={STRIPE_SELF_UPGRADE_PRICING_TABLE_ID}
                  publishableKey={STRIPE_SELF_UPGRADE_PRICING_TABLE_PUBLISHABLE_KEY}
                />
              </PricingTableContainer>
            )}
          {organization.plan.name === PLAN_LABELS.CORE && (
            <div>
              <PlusHeader>
                <PlusHeaderHighlight>Plus Tier</PlusHeaderHighlight> coming soon!
                <NewBadge>New</NewBadge>
              </PlusHeader>
              <PlusFeatureList>
                <li>Insight & Reporting</li>
                <li>Custom Domains</li>
                <li>Benchmarking</li>
              </PlusFeatureList>
              <LinkButton href={HELP_URL} target="_blank">
                Join the Waitlist
              </LinkButton>
            </div>
          )}
        </>
      )}
      <Link href={PRICING_URL} target="_blank">
        View full pricing comparison
      </Link>
    </SettingsSection>
  );
}

UpgradePlan.propTypes = UpgradePlanPropTypes;
export default UpgradePlan;
