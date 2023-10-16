import i18n from 'i18n';

/**
 *  This element is never displayed on-page. It contains settings only. See
 *  <DonationPage> for where this is filtered out for display.
 */
function DPayment() {
  return null;
}

DPayment.propTypes = {};
DPayment.type = 'DPayment';
DPayment.displayName = i18n.t('donationPage.dPayment.paymentFees');
DPayment.description = i18n.t('donationPage.dPayment.handlePayment');
DPayment.required = true;
DPayment.unique = true;
DPayment.requireContent = true;
DPayment.contentMissingMsg = i18n.t('donationPage.dPayment.missingPaymentMethodConfiguration');

export default DPayment;
