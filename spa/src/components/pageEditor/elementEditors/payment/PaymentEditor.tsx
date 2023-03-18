import PropTypes, { InferProps } from 'prop-types';
import { Checkbox, Switch } from 'components/base';
import { AlignedFormControlLabel, StrongTip, Tip } from './PaymentEditor.styled';
import { PaymentElement } from 'hooks/useContributionPage';
import { useEffect } from 'react';

const PaymentEditorPropTypes = {
  elementContent: PropTypes.object.isRequired,
  onChangeElementContent: PropTypes.func.isRequired
};

export interface PaymentEditorProps extends InferProps<typeof PaymentEditorPropTypes> {
  elementContent: PaymentElement['content'];
  onChangeElementContent: (value: PaymentElement['content']) => void;
}

function PaymentEditor({ elementContent, onChangeElementContent }: PaymentEditorProps) {
  // If the element doesn't allow paying fees, disable selection by default too.

  useEffect(() => {
    if (!elementContent.offerPayFees && elementContent.payFeesDefault) {
      onChangeElementContent({ ...elementContent, payFeesDefault: false });
    }
  }, [elementContent, onChangeElementContent]);

  return (
    <div data-testid="payment-editor">
      <Tip>
        Configure the ability of your contributors to pay transaction fees so they won't be deducted from your payout.{' '}
        <StrongTip>Available payment methods must be configured in Stripe.</StrongTip>
      </Tip>
      <AlignedFormControlLabel
        control={
          <Switch
            onChange={(event) => onChangeElementContent({ ...elementContent, offerPayFees: event.target.checked })}
            checked={elementContent.offerPayFees}
          />
        }
        label="Offer option to pay payment provider fees"
      />
      <AlignedFormControlLabel
        control={
          <Checkbox
            checked={elementContent.payFeesDefault}
            onChange={(event) => onChangeElementContent({ ...elementContent, payFeesDefault: event.target.checked })}
          />
        }
        disabled={!elementContent.offerPayFees}
        label="Selected by default"
      />
    </div>
  );
}

PaymentEditor.propTypes = PaymentEditorPropTypes;
export default PaymentEditor;
