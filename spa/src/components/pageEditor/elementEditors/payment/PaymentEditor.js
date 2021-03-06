import * as S from './PaymentEditor.styled';
import { useTheme } from 'styled-components';

import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

const STRIPE_PAYMENT_METHODS = [
  { value: 'card', displayName: 'card' },
  { value: 'apple', displayName: 'Apple Pay' },
  { value: 'google', displayName: 'Google Pay' },
  { value: 'browser', displayName: 'Browser-saved card' }
];
const NOT_ENOUGH_PAYMENT_METHODS = 'You must enable at least one payment method';

function PaymentEditor() {
  const theme = useTheme();
  const { elementContent, setElementContent } = useEditInterfaceContext();

  const setToggled = (checked, method, provider) => {
    let enabledMethods = { ...(elementContent || {}) };
    if (checked) {
      const mIndex = enabledMethods[provider]?.findIndex((m) => m === method);
      // No mIndex means enbabledMethods was empty.
      if (!mIndex) {
        enabledMethods[provider] = [method];
      } else if (mIndex === -1) enabledMethods[provider].push(method);
    } else {
      enabledMethods[provider] = enabledMethods[provider].filter((m) => m !== method);
    }
    setElementContent({ ...(elementContent || {}), ...enabledMethods });
  };

  const toggleOfferPayFees = (_, { checked }) => {
    const offerPayFees = checked;
    setElementContent({ ...elementContent, offerPayFees });
  };

  const togglePayFeesDefault = (_, checked) => {
    const payFeesDefault = checked;
    setElementContent({ ...elementContent, payFeesDefault });
  };

  return (
    <S.PaymentEditor data-testid="payment-editor">
      <S.PaymentTypesList>
        {STRIPE_PAYMENT_METHODS.map((paymentMethod) => (
          <S.ToggleWrapper key={paymentMethod.value}>
            <S.Toggle
              label={`Enable payment via ${paymentMethod.displayName}`}
              toggle
              checked={isPaymentMethodOn(paymentMethod.value, elementContent?.stripe)}
              onChange={(_e, { checked }) => setToggled(checked, paymentMethod.value, 'stripe')}
            />
          </S.ToggleWrapper>
        ))}
      </S.PaymentTypesList>
      <S.OtherOptionsList>
        <S.ToggleWrapper>
          <S.Toggle
            label="Offer option to pay payment provider fees"
            checked={elementContent?.offerPayFees}
            onChange={toggleOfferPayFees}
            toggle
          />
        </S.ToggleWrapper>
        <S.RadioWrapper>
          <S.Radio
            id="pay-fees-by-default"
            data-testid="pay-fees-by-default"
            type="checkbox"
            color={theme.colors.primary}
            checked={elementContent?.payFeesDefault}
            onChange={togglePayFeesDefault}
          />
          <S.RadioLabel htmlFor="pay-fees-by-default">selected by default</S.RadioLabel>
        </S.RadioWrapper>
      </S.OtherOptionsList>
    </S.PaymentEditor>
  );
}

PaymentEditor.for = 'DPayment';

export default PaymentEditor;

PaymentEditor.hasErrors = (content) => {
  if (!content) return NOT_ENOUGH_PAYMENT_METHODS;
  const nonProviderKeys = ['offerPayFees'];

  // Each provider must have at least one method
  let hasErrors = false;
  Object.keys(content).forEach((provider) => {
    if (!nonProviderKeys.includes(provider) && content[provider].length < 1) hasErrors = true;
  });

  if (hasErrors) return NOT_ENOUGH_PAYMENT_METHODS;
  return hasErrors;
};

function isPaymentMethodOn(value, methodList) {
  if (!value || !methodList) return false;
  return methodList.some((method) => method === value);
}
