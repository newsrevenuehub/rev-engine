import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent } from 'react';
import { FormControlLabel } from 'components/base';
import { ContributionInterval } from 'constants/contributionIntervals';
import formatStringAmountForDisplay from 'utilities/formatStringAmountForDisplay';
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import { Header, ThemedCheckbox } from './PayFeesControl.styled';

const PayFeesControlPropTypes = {
  agreedToPayFees: PropTypes.bool.isRequired,
  currencyCode: PropTypes.string.isRequired,
  currencySymbol: PropTypes.string.isRequired,
  feeAmount: PropTypes.number.isRequired,
  frequency: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  revenueProgramName: PropTypes.string.isRequired
};

export interface PayFeesControlProps extends InferProps<typeof PayFeesControlPropTypes> {
  frequency: ContributionInterval;
  onChange: (event: ChangeEvent) => void;
}

export function PayFeesControl({
  agreedToPayFees,
  currencyCode,
  currencySymbol,
  feeAmount,
  frequency,
  onChange,
  revenueProgramName
}: PayFeesControlProps) {
  const formattedAmount = `${currencySymbol}${formatStringAmountForDisplay(feeAmount)} ${currencyCode}`;
  const formattedFrequency = getFrequencyAdjective(frequency).toLocaleLowerCase();

  return (
    <div data-testid="pay-fees">
      <Header>Agree to pay fees?</Header>
      <FormControlLabel
        control={<ThemedCheckbox checked={agreedToPayFees} onChange={onChange} />}
        label={`I agree to pay a ${formattedFrequency} transaction fee of ${formattedAmount} to direct more support to ${revenueProgramName}'s mission.`}
      />
    </div>
  );
}

PayFeesControl.propTypes = PayFeesControlPropTypes;
export default PayFeesControl;
