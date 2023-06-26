import { PaymentMethodCreateParams, Stripe, StripeCardElement } from '@stripe/stripe-js';
import { ContributionInterval } from 'constants/contributionIntervals';
import { PAYMENT_SUCCESS } from 'routes';
import calculateStripeFee from 'utilities/calculateStripeFee';
import formatStringAmountForDisplay from 'utilities/formatStringAmountForDisplay';
import { getFrequencyAdverb } from 'utilities/parseFrequency';

/**
 * getTotalAmount takes an amount in dollars and an optional fee in dollars and adds them up.
 * @param {number} amount - float or integer, human-readable amount to be donated
 * @param {boolean} shouldPayFee - whether or not to include the fee in the total value
 * @param {string} frequency - The donation interval (ie 'one_time', 'monthly', etc). Used to determine stripe fee
 * @param {boolean} rpIsNonProfit - whether or not the revenue program reports as non-profit. Used to determine stripe fee
 * @returns A human readable amount in dollars
 */
export function getTotalAmount(
  amount: number | string,
  shouldPayFee: boolean,
  frequency: ContributionInterval,
  rpIsNonProfit: boolean
) {
  let total = parseFloat(amount as string);

  if (shouldPayFee) {
    const fee = calculateStripeFee(amount, frequency, rpIsNonProfit);

    // Fee might be null if amount isn't a number.
    // TODO handle this better?

    if (fee) {
      total += fee;
    }
  }

  let result = total.toFixed(2);

  if (result.endsWith('.00')) {
    result = result.substring(0, result.length - 3);
  }

  return result;
}

function serializeForm(form: HTMLFormElement) {
  const booleans = ['swag_opt_out', 'tribute_type_honoree', 'tribute_type_in_memory_of'];
  const tributesToConvert = { tribute_type_honoree: 'type_honoree', tribute_type_in_memory_of: 'type_in_memory_of' };
  const obj: Record<string, File | boolean | null | string> = {};
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
    if (key in tributesToConvert) {
      obj.tribute_type = tributesToConvert[key as keyof typeof tributesToConvert];
    }
  }

  return obj;
}

export interface ContributionFormExtraData {
  amount: string;
  currency: string;
  frequency: ContributionInterval;
  mailingCountry: string;
  pageId: string;
  pageSlug: string;
  payFee: boolean;
  reCAPTCHAToken: string;
  revProgramSlug: string;
  rpCountry: string;
  rpIsNonProfit: boolean;
  salesforceCampaignId?: string;
}

/**
 * serializeData takes a ref to a form, turns it into a javascript object, then merges in non-form state.
 * @param {object} formRef - a reference to the form element containing all our inputs
 * @param {object} state - any form state not contained in formRef (things that weren't using inputs)
 * @returns JSON-serialized form data
 */
export function serializeData(formRef: HTMLFormElement, state: ContributionFormExtraData) {
  const serializedData = serializeForm(formRef);

  serializedData.agreed_to_pay_fees = state.payFee;
  serializedData.amount = getTotalAmount(state.amount, state.payFee, state.frequency, state.rpIsNonProfit).toString();
  serializedData.donor_selected_amount = state.amount;
  serializedData.revenue_program_slug = state.revProgramSlug;
  serializedData.mailing_country = state.mailingCountry;
  serializedData.donation_page_slug = state.pageSlug;
  serializedData.revenue_program_country = state.rpCountry;
  serializedData.currency = state.currency;
  serializedData.page = state.pageId;
  serializedData.captcha_token = state.reCAPTCHAToken;

  if (state.salesforceCampaignId) {
    serializedData.sf_campaign_id = state.salesforceCampaignId;
  }

  return serializedData;
}

/**
 * Form fields that payment methods are concerned with. **THIS TYPE DOES NOT
 * INCLUDE ALL FORM FIELDS.**
 */
export interface PaymentMethodFormData {
  first_name?: string;
  last_name?: string;
}

/**
 * createPaymentMethod is used when we cannot simply pass a Stripe Element-- that is, we're collecting
 * a payment method for deferred payment. This occurs only on recurring donations made via card.
 * @param {object} stripe - the organization-tied stripe SDK instance
 * @param {object} card - An object with key 'card' whose value is a stripe card element
 * @param {object} data - JSON-serialized form data
 * @returns a response from stripe.createPaymentMethod
 */
export async function createPaymentMethod(stripe: Stripe, card: StripeCardElement, data?: PaymentMethodFormData) {
  const billing_details: PaymentMethodCreateParams.BillingDetails = {};
  if (data?.first_name || data?.last_name) {
    billing_details.name = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim();
  }
  return stripe.createPaymentMethod({
    card,
    type: 'card',
    billing_details
  });
}

export interface GetPaymentSuccessUrlArgs {
  amount: string;
  baseUrl: string;
  contributorEmail: string;
  emailHash: string;
  frequencyDisplayValue: string;
  pageSlug: string;
  pathName: string;
  rpSlug: string;
  thankYouRedirectUrl: string;
}

export function getPaymentSuccessUrl({
  baseUrl,
  thankYouRedirectUrl,
  amount,
  emailHash,
  frequencyDisplayValue,
  contributorEmail,
  pageSlug,
  rpSlug,
  pathName
}: GetPaymentSuccessUrlArgs) {
  const missingParams = Object.fromEntries(
    Object.entries({
      baseUrl,
      amount,
      emailHash,
      frequencyDisplayValue,
      contributorEmail,
      pageSlug,
      rpSlug,
      pathName
    }).filter(([, v]) => [undefined, null].includes(v as any))
  );
  if (Object.entries(missingParams).length) {
    throw new Error(`Missing argument for: ${Object.keys(missingParams).join(', ')}`);
  }
  const paymentSuccessUrl = new URL(PAYMENT_SUCCESS, baseUrl);
  // Some notes on parameters for URL search generation below:
  // uid: maps to emailHash from function params
  //
  // When a donation page has a custom thank you page that is off-site, we
  // eventually next the user to that page, appending several query parameters, one
  // of which is a `uid` parameter that org's can use to anonymously track contributors
  // in their analytics layer without exposing raw contributor email to ad tech providers.
  //
  // email: maps to contributorEmail from function params
  //
  // Our internal thank you page needs the raw value of the contributor
  // email to display message on the page. There's no privacy concerns around sharing the
  // email address with Stripe (they already have it) or within our site.

  // pageSlug
  //
  // The thank you page that eventually loads needs to data that is on the
  // page model from API. We pass the `pageSlug`, and the success page will be able to use this +
  // the `rpSlug`to request the LIVE_PAGE_DETAIL. Ideally, we'd just use the page
  // id to this end, but at present that API endpoint requires authentication.

  // rpSlug: nothing special to note

  // fromPath: pathName in function params
  // We pass this along because the thank you page we eventually need to show
  // will appear at rev-program-slug.revengine.com/page-name/thank-you if the page was served
  // from specific page name. On other hand, if a revenue program has a default donation page
  // set up, that page can appear at rev-program-slug.revengine.com/ (with no page), in which
  // case, the thank-you page URL can be rev-program-slug.revengine.com/thank-you.
  paymentSuccessUrl.search = new URLSearchParams({
    amount,
    pageSlug,
    rpSlug,
    email: contributorEmail,
    frequency: frequencyDisplayValue,
    fromPath: pathName === '/' ? '' : pathName,
    next: thankYouRedirectUrl,
    uid: emailHash
  }).toString();

  return paymentSuccessUrl.href;
}

interface GetPaymentElementButtonTextArgs {
  currencyCode: string;
  currencySymbol: string;
  amount: number;
  frequency: ContributionInterval;
}

export function getPaymentElementButtonText({
  currencyCode,
  currencySymbol,
  amount,
  frequency
}: GetPaymentElementButtonTextArgs) {
  return `Give ${currencySymbol}${formatStringAmountForDisplay(amount)}${
    currencyCode ? ' ' + currencyCode : ''
  } ${getFrequencyAdverb(frequency)}`;
}
