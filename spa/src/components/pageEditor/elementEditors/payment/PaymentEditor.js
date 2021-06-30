import * as S from './PaymentEditor.styled';

import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

const STRIPE_PAYMENT_METHODS = [
  { value: 'card', displayName: 'card' },
  { value: 'apple', displayName: 'Apple Pay' },
  { value: 'google', displayName: 'Google Pay' },
  { value: 'browser', displayName: 'Browser-saved card' }
];
const NOT_ENOUGH_PAYMENT_METHODS = 'You must enable at least one payment method';

function PaymentEditor() {
  const { elementContent, setElementContent } = useEditInterfaceContext();

  const setToggled = (checked, method, provider) => {
    let enabledMethods = { ...elementContent };
    if (checked) {
      const mIndex = enabledMethods[provider].findIndex((m) => m === method);
      if (mIndex === -1) enabledMethods[provider].push(method);
    } else {
      enabledMethods[provider] = enabledMethods[provider].filter((m) => m !== method);
    }
    setElementContent({ ...elementContent, ...enabledMethods });
  };

  return (
    <S.PaymentEditor data-testid="payment-editor">
      {STRIPE_PAYMENT_METHODS.map((paymentMethod) => (
        <S.ToggleWrapper key={paymentMethod.value}>
          <S.Toggle
            label={`Enable payment via ${paymentMethod.displayName}`}
            toggle
            checked={isPaymentMethodOn(paymentMethod.value, elementContent.stripe)}
            onChange={(_e, { checked }) => setToggled(checked, paymentMethod.value, 'stripe')}
          />
        </S.ToggleWrapper>
      ))}
    </S.PaymentEditor>
  );
}

PaymentEditor.for = 'DPayment';

export default PaymentEditor;

PaymentEditor.hasErrors = (content) => {
  // Each provider must have at least one method
  let hasErrors = false;
  Object.keys(content).forEach((provider) => {
    if (content[provider].length < 1) hasErrors = true;
  });

  if (hasErrors) return NOT_ENOUGH_PAYMENT_METHODS;
  return hasErrors;
};

function isPaymentMethodOn(value, methodList) {
  return methodList.some((method) => method === value);
}
