/**
 *
 * @param {object} user
 * @returns {boolean}
 * If user org has default_payment_provider, the org must also have the correct account id field populated.
 * If these conditions are met, user "has payment provider"
 */
function userHasPaymentProvider(user) {
  const defaultProvider = user?.organization?.default_payment_provider;

  let paymentProviderAccountId = '';
  if (defaultProvider == 'stripe') {
    paymentProviderAccountId = user?.organization?.stripe_account_id;
  }

  return defaultProvider && paymentProviderAccountId;
}

export default userHasPaymentProvider;
