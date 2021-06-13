import * as S from './DPayment.styled';
import DElement from './DElement';

// Stripe
import StripePaymentWidget from 'components/paymentProviders/stripe/StripePaymentWidget';

function DPayment({ element, live, ...props }) {
  /*
    element.content is an object, whose keys are providers.
    For instance, element.content.stripe is an array of supported payment types:
    eg ["card", "apple", "google"]

    Eventually we may support multiple providers, each with different supported payment methods.
    Vaguely, it seems likely we'd want some sort of tabbed-interface where each tab is a provider.
    For now, we only support stripe, so there's no need for a fancy interface.
  */
  return (
    <DElement>
      {live ? <S.DPayment>{element.content['stripe'] && <StripePaymentWidget />}</S.DPayment> : <NotLivePlaceholder />}
    </DElement>
  );
}

export default DPayment;

function NotLivePlaceholder() {
  return <h2>Stripe payment will go here</h2>;
}
