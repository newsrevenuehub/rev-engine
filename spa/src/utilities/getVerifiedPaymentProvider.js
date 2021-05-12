/**
 *
 * @param {object} user
 * @returns {boolean}
 * 1. User org has default_payment_provider
 * 2. User org must have the correct account id field populated, based on default_payment_provider.
 * If these conditions are met, user "has payment provider"
 */
function getVerifiedPaymentProvider(user) {
  const defaultProvider = user?.organization?.default_payment_provider;

  let ppAccountIdPresent = false;
  let ppAccountVerified = false;
  if (defaultProvider === 'stripe') {
    ppAccountIdPresent = !!user?.organization?.stripe_account_id;
    ppAccountVerified = !!user?.organization?.stripe_verified;
  }

  return !!defaultProvider && ppAccountIdPresent && ppAccountVerified ? defaultProvider : null;
}

export default getVerifiedPaymentProvider;
