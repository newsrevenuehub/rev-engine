const STRIPE_NP_RATE = 0.027;
const STRIPE_FP_RATE = 0.034;
const STRIPE_FIXED = 0.3;

function calculateStripeFee(amount, isNonProfit) {
  /*
    Stripe calculates a fee based on a rate and a flat fee. We must apply the flat fee first,
    then apply the rate to amount + flat fee.

    There was some question around whether Apple Pay and Google Pay included different flat 
    fees or rates. According to these articles, they do not:
    https://support.stripe.com/questions/pricing-for-apple-pay-with-stripe
    https://support.stripe.com/questions/pricing-for-google-pay-with-stripe

    The following article is the source of this formula:
    https://support.stripe.com/questions/passing-the-stripe-fee-on-to-customers

    NOTE: We are not including any VAT or GST, or any other taxes here, since these are donations.
  */

  if (isNaN(amount)) return null;
  const RATE = isNonProfit ? STRIPE_NP_RATE : STRIPE_FP_RATE;
  // Get "new amount" after stripe rates are applied
  let newAmount = (amount + STRIPE_FIXED) / (1 - RATE);
  // Calculate fee based on this amount, so that organizations recieve exactly the amount intended without fees
  const fee = newAmount.toFixed(2) * RATE + STRIPE_FIXED;

  return fee.toFixed(2);
}

export default calculateStripeFee;
