import { useTheme } from 'styled-components';
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';
import { OtherOptionsList, Radio, RadioLabel, RadioWrapper, Toggle, ToggleWrapper } from './PaymentEditor.styled';

/**
 * Name of an element property the user can change on a DPayment.
 */
type PaymentPropertyName = 'offerPayFees' | 'payFeesDefault';

function PaymentEditor() {
  const theme = useTheme();
  const { elementContent, setElementContent } = useEditInterfaceContext();

  function updateElement(propertyName: PaymentPropertyName, value: boolean) {
    setElementContent({ ...elementContent, [propertyName]: value });
  }

  return (
    <div data-testid="payment-editor">
      <p>
        Configure the ability of your contributors to pay transaction fees so they won't be deducted from your payout.
        <strong>Available payment methods must be configured in Stripe.</strong>
      </p>
      <OtherOptionsList>
        <ToggleWrapper>
          <Toggle
            label="Offer option to pay payment provider fees"
            checked={elementContent?.offerPayFees}
            onChange={(_: never, { checked }: { checked: boolean }) => updateElement('offerPayFees', checked)}
            toggle
          />
        </ToggleWrapper>
        <RadioWrapper>
          <Radio
            id="pay-fees-by-default"
            data-testid="pay-fees-by-default"
            color={theme.colors.primary as any}
            checked={elementContent?.payFeesDefault}
            onChange={(event, checked) => updateElement('payFeesDefault', checked)}
          />
          <RadioLabel htmlFor="pay-fees-by-default">selected by default</RadioLabel>
        </RadioWrapper>
      </OtherOptionsList>
    </div>
  );
}

PaymentEditor.for = 'DPayment';

export default PaymentEditor;
