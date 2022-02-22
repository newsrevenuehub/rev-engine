import { PP_STATES } from 'components/connect/BaseProviderInfo';

/**
 *
 * @param {object} user
 * @returns {boolean}
 * 1. User org has default_payment_provider
 * 2. User org must have the correct account id field populated, based on default_payment_provider.
 * If these conditions are met, user "has payment provider"
 */
function getGlobalPaymentProviderStatus(user) {
  const organization = user?.role_assignment?.organization;

  if (!organization) {
    // If a user's role is not associated with any organization, they must be a hub_admin or a super user.
    // In this case, we just tell the system that everything's fine so they can proceed.
    return PP_STATES.CONNECTED;
  }

  if (organization.default_payment_provider === 'stripe') {
    const accountIdPresent = !!organization.stripe_account_id;
    const accountVerified = !!organization.stripe_verified;
    return getStripePaymentManagerProviderStatus(accountIdPresent, accountVerified);
  }

  return undefined;
}

function getStripePaymentManagerProviderStatus(accountIdPresent, accountVerified) {
  if (accountIdPresent && accountVerified) return PP_STATES.CONNECTED;
  if (accountIdPresent && !accountVerified) return PP_STATES.RESTRICTED;
  if (!accountIdPresent) return PP_STATES.NOT_CONNECTED;
}

export default getGlobalPaymentProviderStatus;
