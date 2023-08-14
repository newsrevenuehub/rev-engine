/**
 *  This element is never displayed on-page. It contains settings only. See
 *  <DonationPage> for where this is filtered out for display.
 */
function DPayment() {
  return null;
}

DPayment.propTypes = {};
DPayment.type = 'DPayment';
DPayment.displayName = 'Payment Fees';
DPayment.description = 'Handle payment processing fees';
DPayment.required = true;
DPayment.unique = true;
DPayment.requireContent = true;
DPayment.contentMissingMsg = `${DPayment.displayName} needs to have at least one payment method configured.`;

export default DPayment;
