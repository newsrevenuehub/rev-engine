import * as S from './DPayment.styled';
import DElement from './DElement';
import { ICONS } from 'assets/icons/SvgIcon';

// Util
import { getFrequencyAdverb } from 'utilities/parseFrequency';
import calculateStripeFee from 'utilities/calculateStripeFee';

// Context
import { usePage } from '../DonationPage';

// Stripe
import StripePayment from 'components/paymentProviders/stripe/StripePayment';

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
      {live ? (
        <S.DPayment>
          {element?.content && element.content['stripe'] && (
            <StripePayment
              offerPayFees={element.content?.offerPayFees}
              payFeesDefault={element.content?.payFeesDefault}
            />
          )}
        </S.DPayment>
      ) : (
        <NotLivePlaceholder />
      )}
    </DElement>
  );
}

DPayment.type = 'DPayment';
DPayment.displayName = 'Payment';
DPayment.description = 'Allow donors to contribute';
DPayment.required = true;
DPayment.unique = true;

export default DPayment;

function NotLivePlaceholder() {
  return (
    <S.NotLivePlaceholder>
      [Placeholder] Donations <S.NotLiveIcon icon={ICONS.STRIPE_POWERED} />
    </S.NotLivePlaceholder>
  );
}

export function PayFeesWidget() {
  const { page, frequency, amount, payFee, setPayFee } = usePage();

  return (
    <S.PayFees data-testid="pay-fees">
      <S.PayFeesQQ>Agree to pay fees?</S.PayFeesQQ>
      <S.Checkbox
        label={
          amount
            ? `$${calculateStripeFee(amount, frequency, page.organization_is_nonprofit)} ${getFrequencyAdverb(
                frequency
              )}`
            : ''
        }
        toggle
        checked={payFee}
        onChange={(_e, { checked }) => setPayFee(checked)}
        data-testid={`pay-fees-${payFee ? 'checked' : 'not-checked'}`}
      />
      <S.PayFeesDescription>
        Paying the Stripe transaction fee, while not required, directs more money in support of our mission.
      </S.PayFeesDescription>
    </S.PayFees>
  );
}
