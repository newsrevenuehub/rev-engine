import { ContributionInterval, CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';

const STRIPE_NP_RATE = 0.022;
const STRIPE_FP_RATE = 0.029;
const STRIPE_FIXED = 0.3;
const SUBSCRIPTION_UPCHARGE = 0.005;
const SUBSCRIPTION_UPCHARGE_ENABLED = false;

function calculateStripeFee(amount: number | string, interval: ContributionInterval, isNonProfit: boolean) {
  /*
    Stripe calculates a fee based on a rate and a flat fee. We must apply the flat fee first,
    then apply the rate to amount + flat fee.

    There was some question around whether Apple Pay and Google Pay included different flat
    fees or rates. According to these articles, they do not:
    https://support.stripe.com/questions/pricing-for-apple-pay-with-stripe
    https://support.stripe.com/questions/pricing-for-google-pay-with-stripe

    The following article is the source of this formula:
    https://support.stripe.com/questions/passing-the-stripe-fee-on-to-customers

    NOTE: We are not including any VAT or GST, or any other taxes here, since these are contributions.
  */

  const amountInt = parseFloat(amount as string);

  if (isNaN(amountInt) || amountInt < 0) {
    return null;
  }

  const isRecurring = interval !== CONTRIBUTION_INTERVALS.ONE_TIME;
  let RATE = isNonProfit ? STRIPE_NP_RATE : STRIPE_FP_RATE;

  if (isRecurring && SUBSCRIPTION_UPCHARGE_ENABLED) {
    RATE += SUBSCRIPTION_UPCHARGE;
  }

  const amountWithFee = roundTo2DecimalPlaces((amountInt + STRIPE_FIXED) / (1 - RATE));

  return roundTo2DecimalPlaces(amountWithFee - amountInt);
}

export default calculateStripeFee;

// Exporting for test purposes only.

export function roundTo2DecimalPlaces(num: number) {
  return Math.round(num * 100) / 100;
}
