import * as Sentry from '@sentry/react';
import { STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL } from 'appSettings';
import { Link } from 'components/base';
import SettingsSection from 'components/common/SettingsSection';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import { Organization } from 'hooks/useUser.types';
import PropTypes, { InferProps } from 'prop-types';
import { useEffect } from 'react';

const ManageSubscriptionPropTypes = {
  organization: PropTypes.object.isRequired
};

export interface ManageSubscriptionProps extends InferProps<typeof ManageSubscriptionPropTypes> {
  organization: Organization;
}

export function ManageSubscription({ organization }: ManageSubscriptionProps) {
  const hideManageSubscription = organization.plan.name === PLAN_NAMES.FREE;

  useEffect(() => {
    if (hideManageSubscription) {
      return;
    }

    if (
      typeof STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL !== 'string' ||
      STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL?.length === 0
    ) {
      Sentry.addBreadcrumb({
        category: 'rev-engine',
        level: 'debug',
        message: `Manage my plan URL: "${STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL}"`
      });
      console.error('STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL is not valid.');
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
