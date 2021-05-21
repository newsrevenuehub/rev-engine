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
  const defaultProvider = user?.organization?.default_payment_provider;

  if (defaultProvider === 'stripe') {
    const accountIdPresent = !!user?.organization?.stripe_account_id;
    const accountVerified = !!user?.organization?.stripe_verified;
    return getStripePaymentProviderStatus(accountIdPresent, accountVerified);
  }

  return undefined;
}

function getStripePaymentProviderStatus(accountIdPresent, accountVerified) {
  if (accountIdPresent && accountVerified) return PP_STATES.CONNECTED;
  if (accountIdPresent && !accountVerified) return PP_STATES.RESTRICTED;
  if (!accountIdPresent) return PP_STATES.NOT_CONNECTED;
}

export default getGlobalPaymentProviderStatus;
