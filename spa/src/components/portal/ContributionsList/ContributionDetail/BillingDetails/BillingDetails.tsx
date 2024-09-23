import { Checkbox, FormControlLabel } from 'components/base';
import { ContributionInterval } from 'constants/contributionIntervals';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import PropTypes, { InferProps } from 'prop-types';
import { useMemo, useState } from 'react';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import { parseFloatStrictly } from 'utilities/parseFloatStrictly';
import { Columns, Detail, SectionControlButton, Subheading } from '../common.styled';
import { DetailSection } from '../DetailSection';
import DetailSectionEditControls from '../DetailSection/DetailSectionEditControls';
import { CheckboxLabel, StartInputAdornment, AmountField } from './BillingDetails.styled';

const BillingDetailsPropTypes = {
  contribution: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
  enableEditMode: PropTypes.bool,
  editable: PropTypes.bool,
  onEdit: PropTypes.func.isRequired,
  onEditComplete: PropTypes.func.isRequired,
  onUpdateBillingDetails: PropTypes.func.isRequired
};

export interface BillingDetailsProps extends InferProps<typeof BillingDetailsPropTypes> {
  contribution: PortalContributionDetail;
  onUpdateBillingDetails: (amount: number) => void;
}

/**
 * Exported for testing only.
 */
export const INTERVAL_NAMES: Record<ContributionInterval, string> = {
  month: 'Monthly',
  one_time: 'One-time',
  year: 'Yearly'
};

export function BillingDetails({
  contribution,
  disabled,
  enableEditMode = false,
  editable,
  onEdit,
  onEditComplete,
  onUpdateBillingDetails
}: BillingDetailsProps) {
  const amountInDollars = useMemo(() => contribution.amount / 100, [contribution.amount]);
  const [amount, setAmount] = useState(amountInDollars.toString());

  const formattedDate = Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).format(
    // TODO in DEV-5138: use only first_payment_date
    new Date(contribution.first_payment_date ?? contribution.created)
  );

  const disableSave = useMemo(() => {
    const parsedValue = parseFloatStrictly(amount);

    return isNaN(parsedValue) || parsedValue <= 0 || parsedValue === amountInDollars;
  }, [amount, amountInDollars]);

  const handleSave = () => {
    const formattedAmount = parseFloatStrictly(amount);

    if (isNaN(formattedAmount)) {
      // Should never happen
      throw new Error('Amount is not a number');
    }

    onUpdateBillingDetails(formattedAmount * 100);
    onEditComplete();
  };

  const handleCancel = () => {
    setAmount(amountInDollars?.toString());
    onEditComplete();
  };

  const controls = editable ? (
    <DetailSectionEditControls saveDisabled={disableSave} onCancel={handleCancel} onSave={handleSave} />
  ) : (
    <SectionControlButton disabled={!!disabled} onClick={onEdit}>
      Change billing details
    </SectionControlButton>
  );

  return (
    <DetailSection
      disabled={disabled}
      highlighted={editable}
      title="Billing Details"
      {...(enableEditMode && { controls })}
    >
      <Columns>
        <div>
          {editable ? (
            <AmountField
              data-testid="amount"
              fullWidth
              id="amount"
              label="Amount"
              onChange={({ target: { value } }) => {
                const filteredValue = value
                  // Only keep numbers and decimal points
                  .replace(/[^\d\.]/g, '')
                  // Remove anything after first decimal point and two digits
                  .replace(/^(.*?\.\d?\d?).*/, '$1');
                setAmount(filteredValue);
              }}
              inputMode="decimal"
              type="text"
              value={amount}
              InputProps={{
                classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' } as any,
                startAdornment: <StartInputAdornment>$</StartInputAdornment>
              }}
            />
          ) : (
            <>
              <Subheading>Amount</Subheading>
              <Detail data-testid="amount">{formatCurrencyAmount(contribution.amount)}</Detail>
            </>
          )}
        </div>
        <div>
          <FormControlLabel
            control={<Checkbox checked={contribution.paid_fees} disabled />}
            label={<CheckboxLabel>Pay fees</CheckboxLabel>}
          />
        </div>
        <div>
          <Subheading>Billing Date</Subheading>
          <Detail data-testid="first-billing-date">{formattedDate}</Detail>
        </div>
        <div>
          <Subheading>Frequency</Subheading>
          <Detail data-testid="frequency">{INTERVAL_NAMES[contribution.interval]}</Detail>
        </div>
      </Columns>
    </DetailSection>
  );
}

BillingDetails.propTypes = BillingDetailsPropTypes;
export default BillingDetails;
