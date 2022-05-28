import axios from 'ajax/axios';
import { STRIPE_PAYMENT } from 'ajax/endpoints';
import { GENERIC_ERROR } from 'constants/textConstants';
import calculateStripeFee from 'utilities/calculateStripeFee';

const STRIPE_PAYMENT_TIMEOUT = 12 * 1000;

/****************************\
 *  Handle Donation Submit  *
\****************************/
/**
 * submitPayment handle one-time and recurring payments
 * @param {object} stripe - the organization-tied stripe SDK instance
 * @param {object} data - JSON-serialized form data
 * @param {object} paymentMethod - An object of shape { card, paymentRequest } where card is
 *                                 an optional object with key 'card' whose value is a stripe
 *                                 card element, or paymentRequest, an event object returned
 *                                 from a Stripe PaymentRequest
 * @param {function} onSuccess - Fired when payment is successful.
 * @param {function} onFailure - Fired when payment is unsuccessful. Recieves error as argument.
 */
async function submitPayment(stripe, data, { card, paymentRequest }, onSuccess, onFailure) {
  /*
    Here we let all errors bubble up and catch them, rather than try to handle them separately
    in every function down the chain.
  */
  try {
    if (data.interval === 'one_time') {
      const response = await trySinglePayment(stripe, data, { card, paymentRequest });
      onSuccess(paymentRequest, response);
    } else {
      const response = await tryRecurringPayment(stripe, data, { card, paymentRequest });
      onSuccess(paymentRequest, response);
    }
  } catch (error) {
    onFailure(error);
  }
}
export default submitPayment;

/******************\
 *  Process Data  *
\******************/

/**
 * getTotalAmount takes an amount in dollars and an optional fee in dollars and adds them up.
 * @param {number} amount - float or integer, human-readable amount to be donated
 * @param {number} fee - the fee to include, if shouldPayFee
 * @param {boolean} shouldPayFee - whether or not to include the fee in the total value
 * @param {string} frequency - The donation interval (ie 'one_time', 'monthly', etc). Used to determine stripe fee
 * @param {boolean} orgIsNonProfit - whether or not the org reports as non-profit. Used to determine stripe fee
 * @returns A human readable amount in dollars
 */
export function getTotalAmount(amount, shouldPayFee, frequency, orgIsNonProfit) {
  /*
    If we get 10, we should see 10. If we get 10.3, we should see 10.30.
  */
  let total = parseFloat(amount);
  if (shouldPayFee) total += parseFloat(calculateStripeFee(amount, frequency, orgIsNonProfit));
  total = total.toFixed(2);
  if (total.endsWith('.00')) total = total.substring(0, total.length - 3);
  return total;
}

/**
 * amountToCents takes your human-readable amount in dollars and coverts it to cents
 * @param {number} amount - float or integer, human-readable amount to be donated
 * @returns null if amount is NaN, else dollar amount in cents.
 */
export const amountToCents = (amount) => {
  if (isNaN(amount)) return null;
  const cents = amount * 100;
  // amount * 100 above can results in something like 26616.000000000004.
  // We just round to an integer here.
  return Math.round(cents);
};

function serializeForm(form) {
  /*
    Rather than trying to hoist all form state up to a common parent,
    we've wrapped the page in a <form> element. Here, we grab a ref
    to that form and turn it in to FormData, then we serialize that
    form data in to a javascript object.

    This really is easier than managing all the form state in a common
    parent. Trust me.
  */
  const booleans = ['swag_opt_out', 'comp_subscription', 'tribute_type_honoree', 'tribute_type_in_memory_of'];
  const tributesToConvert = { tribute_type_honoree: 'type_honoree', tribute_type_in_memory_of: 'type_in_memory_of' };
  const obj = {};
  const formData = new FormData(form);
  for (const key of formData.keys()) {
    if (booleans.includes(key)) {
      // If it's a bool checkbox, its mere presence on in FormData indicates that it is checked.
      // Here we explicitly set that value to "true".
      obj[key] = true;
    } else {
      obj[key] = formData.get(key);
    }
    // tribute_type could be either a radio or a checkbox.
    // If it's a checkbox, we need to convert the "true" value to the expected value
    if (tributesToConvert[key]) obj.tribute_type = tributesToConvert[key];
  }
  return obj;
}

/**
 * serializeData takes a ref to a form, turns it into a javascript object, then merges in non-form state.
 * @param {object} formRef - a reference to the form element containing all our inputs
 * @param {object} state - any form state not contained in formRef (things that weren't using inputs)
 * @returns JSON-serialized form data
 */
export function serializeData(formRef, state) {
  const serializedData = serializeForm(formRef);
  serializedData['amount'] = getTotalAmount(
    state.amount,
    state.payFee,
    state.frequency,
    state.orgIsNonProfit
  ).toString();
  serializedData['donor_selected_amount'] = state.amount;
  serializedData['agreed_to_pay_fees'] = state.payFee;
  serializedData['revenue_program_slug'] = state.revProgramSlug;
  serializedData['donation_page_slug'] = state.pageSlug;
  serializedData['organization_country'] = state.orgCountry;
  serializedData['currency'] = state.currency;
  serializedData['page_id'] = state.pageId;
  if (state.salesforceCampaignId) serializedData['sf_campaign_id'] = state.salesforceCampaignId;
  if (state.reCAPTCHAToken) serializedData['captcha_token'] = state.reCAPTCHAToken;

  return serializedData;
}

/***********************\
 *  One-time Payments  *
\***********************/

/**
 * trySinglePayment creates a payment intent via RevEngine backend then finishes
 * the payment with stripe using the returned paymentIntent object.
 * @param {object} stripe - the organization-tied stripe SDK instance
 * @param {object} formData - JSON-serialized form data
 * @param {object} paymentMethod - An object of shape { card, paymentRequest } where card is
 *                                 an optional object with key 'card' whose value is a stripe
 *                                 card element, or paymentRequest, an event object returned
 *                                 from a Stripe PaymentRequest
 */
async function trySinglePayment(stripe, formData, { card, paymentRequest }) {
  const createPaymentIntentResponse = await createPaymentIntent(formData);
  const { data: paymentIntent } = createPaymentIntentResponse;
  const paymentMethod = paymentRequest?.paymentMethod?.id || { card };
  await confirmCardPayment(stripe, paymentIntent.clientSecret, paymentMethod, !paymentRequest);
  return createPaymentIntentResponse;
}

/**
 * createPaymentIntent creates a payment intent via RevEngine backend
 * @param {object} formData - JSON-serialized form data
 * @returns {object} A RevEngine response in which response.data is the successfully created paymentIntent
 */
async function createPaymentIntent(formData) {
  return await axios.post(STRIPE_PAYMENT, formData, { timeout: STRIPE_PAYMENT_TIMEOUT });
}

/**
 * confirmCardPayment completes the process with stripe
 * @param {object} stripe - the organization-tied stripe SDK instance
 * @param {string} clientSecret
 * @param {*} paymentMethod - either a paymentMethod id from a paymentRequest, or an object with key 'card' whose value is the card element on the page.
 * @param {boolean} handleActions - Should be false if using a paymentRequest.
 */
async function confirmCardPayment(stripe, clientSecret, payment_method, handleActions) {
  const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, { payment_method }, { handleActions });
  if (error) throw new StripeError(error?.message || GENERIC_ERROR);
  if (paymentIntent.status === 'requires_action') {
    const { error } = await stripe.confirmCardPayment(clientSecret);
    if (error) throw new StripeError(error?.message || GENERIC_ERROR);
  }
}

/************************\
 *  Recurring Payments  *
\************************/

/**
 * tryRecurringPayment creates a PaymentMethod via Stripe and a PaymentIntent via RevEngine backend
 * the payment with stripe using the returned paymentIntent object.
 * @param {object} stripe - the organization-tied stripe SDK instance
 * @param {object} formData - JSON-serialized form data
 * @param {object} paymentMethod - An object of shape { card, paymentRequest } where card is
 *                                 an optional object with key 'card' whose value is a stripe
 *                                 card element, or paymentRequest, an event object returned
 *                                 from a Stripe PaymentRequest
 */
async function tryRecurringPayment(stripe, data, { card, paymentRequest }) {
  let paymentMethod = paymentRequest?.paymentMethod?.id;

  if (!paymentMethod) {
    const { paymentMethod: pm, error } = await createPaymentMethod(stripe, card, data);
    if (error) throw new StripeError(error?.message || GENERIC_ERROR);
    paymentMethod = pm.id;
  }

  data['payment_method_id'] = paymentMethod;
  const createPaymentIntentResponse = await createPaymentIntent(data);
  return createPaymentIntentResponse;
}

/**
 * createPaymentMethod is used when we cannot simply pass a Stripe Element-- that is, we're collecting
 * a payment method for deferred payment. This occurs only on recurring donations made via card.
 * @param {object} stripe - the organization-tied stripe SDK instance
 * @param {object} card - An object with key 'card' whose value is a stripe card element
 * @param {object} data - JSON-serialized form data
 * @returns a response from stripe.createPaymentMethod
 */
export async function createPaymentMethod(stripe, card, data) {
  const billing_details = {};
  if (data?.first_name || data?.last_name) {
    billing_details.name = `${data.first_name} ${data.last_name}`;
  }
  return await stripe.createPaymentMethod({
    type: 'card',
    card: card,
    billing_details
  });
}

/*******************\
 *  Custom Errors  *
\*******************/
export class StripeError extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = 'StripeError';
  }
}
