import StripePayment from 'components/paymentProviders/stripe/StripePayment';
import { ICONS } from 'assets/icons/SvgIcon';

function PaymentInfo({ element, live }) {
  const {
    page: { stripe_account_id }
  } = usePage();
  /*
    element.content is an object, whose keys are providers.
    For instance, element.content.stripe is an array of supported payment types:
    eg ["card", "apple", "google"]

    Eventually we may support multiple providers, each with different supported payment methods.
    Vaguely, it seems likely we'd want some sort of tabbed-interface where each tab is a provider.
    For now, we only support stripe, so there's no need for a fancy interface.
  */
  return (
    <div>
      {live ? (
        <S.PaymentInfo>
          {element?.content && element.content['stripe'] && (
            <StripePayment offerPayFees={element.content?.offerPayFees} stripeAccountId={stripe_account_id} />
          )}
        </S.PaymentInfo>
      ) : (
        <NotLivePlaceholder />
      )}
    </div>
  );
}

PaymentInfo.type = 'DPayment';
PaymentInfo.displayName = 'Payment';
PaymentInfo.description = 'Allow donors to contribute';
PaymentInfo.required = true;
PaymentInfo.unique = true;
PaymentInfo.requireContent = true;
PaymentInfo.contentMissingMsg = `${PaymentInfo.displayName} needs to have at least one payment method configured.`;

export default PaymentInfo;

function NotLivePlaceholder() {
  return (
    <S.NotLivePlaceholder>
      [Placeholder] Contributions <S.NotLiveIcon icon={ICONS.STRIPE_POWERED} />
    </S.NotLivePlaceholder>
  );
}
