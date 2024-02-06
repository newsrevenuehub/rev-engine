import * as Sentry from '@sentry/react';
import { STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL } from 'appSettings';
import { Link } from 'components/base';
import SettingsSection from 'components/common/SettingsSection';
import { SELF_UPGRADE_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import { Organization, User } from 'hooks/useUser.types';
import PropTypes, { InferProps } from 'prop-types';
import { useEffect } from 'react';
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
  const hideManageSubscription =
    organization.plan.name === PLAN_NAMES.FREE || !flagIsActiveForUser(SELF_UPGRADE_ACCESS_FLAG_NAME, user);

  useEffect(() => {
    if (!hideManageSubscription) {
      if (typeof STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL !== 'string') {
        Sentry.addBreadcrumb({
          category: 'rev-engine',
          level: 'debug',
          message: `Manage my plan URL: "${STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL}"`
        });
        console.error('STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL is not a string');
      } else {
        if (STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL === '') {
          console.warn('STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL is an empty string');
        }
      }
    }
  }, [hideManageSubscription]);

  if (hideManageSubscription) {
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
