import calculateStripeFee from 'utilities/calculateStripeFee';

/******************\
 *  Process Data  *
\******************/

/**s
 * getTotalAmount takes an amount in dollars and an optional fee in dollars and adds them up.
 * @param {number} amount - float or integer, human-readable amount to be donated
 * @param {number} fee - the fee to include, if shouldPayFee
 * @param {boolean} shouldPayFee - whether or not to include the fee in the total value
 * @param {string} frequency - The donation interval (ie 'one_time', 'monthly', etc). Used to determine stripe fee
 * @param {boolean} rpIsNonProfit - whether or not the revenue program reports as non-profit. Used to determine stripe fee
 * @returns A human readable amount in dollars
 */
export function getTotalAmount(amount, shouldPayFee, frequency, rpIsNonProfit) {
  /*
    If we get 10, we should see 10. If we get 10.3, we should see 10.30.
  */
  let total = parseFloat(amount);
  if (shouldPayFee) total += parseFloat(calculateStripeFee(amount, frequency, rpIsNonProfit));
  total = total.toFixed(2);
  if (total.endsWith('.00')) total = total.substring(0, total.length - 3);
  return total;
}

// This function is a short term fix to technical debt in donation form, whereby
// the name of the form field name for swag choice ends up being of form `swag_choice_Hat` or
// `swag_choice_Cup` instead of just `swag_choice. A better fix would be to refactor the
// underlying `DSwag` element, but the level of effort to do that is too much in short term.
function normalizeSwagField(data) {
  const swagKey = Object.keys(data).find((key) => key.includes('swag_choice_'));
  if (!swagKey) {
    return data;
  }
  const swagType = swagKey.split('swag_choice_')[1];
  data['swag_choice'] = `${swagType}: ${data[swagKey]}`;
  delete data[swagKey];
  return data;
}

function serializeForm(form) {
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
    state.rpIsNonProfit
  ).toString();
  serializedData['donor_selected_amount'] = state.amount;
  serializedData['agreed_to_pay_fees'] = state.payFee;
  serializedData['revenue_program_slug'] = state.revProgramSlug;
  serializedData['donation_page_slug'] = state.pageSlug;
  serializedData['revenue_program_country'] = state.rpCountry;
  serializedData['currency'] = state.currency;
  serializedData['page'] = state.pageId;
  serializedData['captcha_token'] = state.reCAPTCHAToken;
  if (state.salesforceCampaignId) serializedData['sf_campaign_id'] = state.salesforceCampaignId;

  return serializedData;
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
