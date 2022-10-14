import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';
import {
  IntroText,
  OtherOptionsList,
  Radio,
  RadioLabel,
  RadioWrapper,
  Toggle,
  ToggleWrapper
} from './PaymentEditor.styled';

/**
 * Name of an element property the user can change on a DPayment.
 */
type PaymentPropertyName = 'offerPayFees' | 'payFeesDefault';

function PaymentEditor() {
  const { elementContent, setElementContent } = useEditInterfaceContext();

  function updateElement(propertyName: PaymentPropertyName, value: boolean) {
    setElementContent({ ...elementContent, [propertyName]: value });
  }

  // TODO: the Toggle component below does not label its input properly.

  return (
    <div data-testid="payment-editor">
      <IntroText>
        Configure the ability of your contributors to pay transaction fees so they won't be deducted from your payout.{' '}
        <strong>Available payment methods must be configured in Stripe.</strong>
      </IntroText>
      <OtherOptionsList>
        <ToggleWrapper>
          <Toggle
            label="Offer option to pay payment provider fees"
            checked={elementContent?.offerPayFees}
            onChange={(_: never, { checked }: { checked: boolean }) => updateElement('offerPayFees', checked)}
            toggle
            type="checkbox"
          />
        </ToggleWrapper>
        <RadioWrapper>
          <Radio
            id="pay-fees-by-default"
            data-testid="pay-fees-by-default"
            color="primary"
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
