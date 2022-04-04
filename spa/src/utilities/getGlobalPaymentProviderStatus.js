import { PP_STATES } from 'components/connect/BaseProviderInfo';
import {
  USER_ROLE_HUB_ADMIN_TYPE,
  USER_ROLE_ORG_ADMIN_TYPE,
  USER_ROLE_RP_ADMIN_TYPE,
  USER_SUPERUSER_TYPE
} from 'constants/authConstants';
import { STRIPE_PAYMENT_PROVIDER_NAME } from 'constants/paymentProviderConstants';

/**
 *
 * @param {object} user
 * @returns {boolean}
 * 1. User org has default_payment_provider
 * 2. User org must have the correct account id field populated, based on default_payment_provider.
 * If these conditions are met, user "has payment provider"
 */
function getGlobalPaymentProviderStatus(user) {
  const organization = user?.roleassignment?.organization;

  const dontNeedProviderTypes = [USER_ROLE_HUB_ADMIN_TYPE, USER_SUPERUSER_TYPE];
  const doNeedProviderTypes = [USER_ROLE_ORG_ADMIN_TYPE, USER_ROLE_RP_ADMIN_TYPE];
  const [roleType, _] = user.role_type;

  if (!organization && dontNeedProviderTypes.includes(roleType)) {
    // superusers and hub admins have pan-org access, and don't need to set payment providers
    return PP_STATES.CONNECTED;
  } else if (!organization && doNeedProviderTypes.includes(roleType)) {
    // throw some kind of error
    debugger;
  } else if (organization?.default_payment_provider === STRIPE_PAYMENT_PROVIDER_NAME) {
    const accountIdPresent = !!organization?.stripe_account_id;
    const accountVerified = !!organization?.stripe_verified;
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
