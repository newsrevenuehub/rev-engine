const STRIPE_NP_RATE = 0.027;
const STRIPE_FP_RATE = 0.029;
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
  const amountInt = parseFloat(amount);
  if (isNaN(amountInt)) return null;
  const RATE = isNonProfit ? STRIPE_NP_RATE : STRIPE_FP_RATE;
  const amountWithFee = roundTo2DecimalPlaces((amountInt + STRIPE_FIXED) / (1 - RATE));
  return roundTo2DecimalPlaces(amountWithFee - amountInt);
}

export default calculateStripeFee;

function roundTo2DecimalPlaces(num) {
  return (Math.round(num * 100) / 100).toFixed(2);
}
