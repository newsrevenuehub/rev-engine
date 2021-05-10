/**
 *
 * @param {object} user
 * @returns {boolean}
 * 1. User org has default_payment_provider
 * 2. User org must have the correct account id field populated, based on default_payment_provider.
 * 3. User org must have correct verification field
 * If these conditions are met, user "has payment provider"
 */
function getConfirmedPaymentProvider(user) {
  const defaultProvider = user?.organization?.default_payment_provider;

  let ppAccountIdPresent = false;
  let ppVerified = false;
  if (defaultProvider === 'stripe') {
    ppAccountIdPresent = !!user?.organization?.stripe_account_id;
    ppVerified = !!user?.organization?.stripe_verified;
  }

  return !!defaultProvider && ppAccountIdPresent && ppVerified ? defaultProvider : null;
}

export default getConfirmedPaymentProvider;
