import PropTypes, { InferProps } from 'prop-types';
import { STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL } from 'appSettings';
import { Link } from 'components/base';
import SettingsSection from 'components/common/SettingsSection';
import { SELF_UPGRADE_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { PLAN_LABELS } from 'constants/orgPlanConstants';
import { Organization, User } from 'hooks/useUser.types';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';

const ManageSubscriptionPropTypes = {
  organization: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired
};

export interface ManageSubscriptionProps extends InferProps<typeof ManageSubscriptionPropTypes> {
  organization: Organization;
  user: User;
}

export function ManageSubscription({ organization, user }: ManageSubscriptionProps) {
  if (organization.plan.name === PLAN_LABELS.FREE || !flagIsActiveForUser(SELF_UPGRADE_ACCESS_FLAG_NAME, user)) {
    return null;
  }

  return (
    <SettingsSection
      orientation="vertical"
      title="Manage Subscription"
      subtitle="Manage your plan through the Stripe portal."
    >
      <Link external href={STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL} target="_blank">
        Manage my plan
      </Link>
    </SettingsSection>
  );
}

ManageSubscription.propTypes = ManageSubscriptionPropTypes;
export default ManageSubscription;
