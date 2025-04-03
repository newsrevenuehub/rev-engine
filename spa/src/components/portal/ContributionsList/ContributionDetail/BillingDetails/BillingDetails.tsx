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
  onUpdateAmount: PropTypes.func.isRequired
};

export interface BillingDetailsProps extends InferProps<typeof BillingDetailsPropTypes> {
  contribution: PortalContributionDetail;
  /**
   * @param amount New amount in integer cents, not dollars.
   * @param donorSelectedAmount Donor-selected amount in dollars, not integer cents.
   */
  onUpdateAmount: (amount: number, donorSelectedAmount: number) => void;
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
  onUpdateAmount: onUpdateBillingDetails
}: BillingDetailsProps) {
  const originalAmountInDollars = useMemo(() => contribution.amount / 100, [contribution.amount]);
  const [editedAmount, setEditedAmount] = useState(originalAmountInDollars.toString());

  const formattedDate = contribution.first_payment_date
    ? Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(contribution.first_payment_date)
      )
    : '—';

  const disableSave = useMemo(() => {
    const parsedValue = parseFloatStrictly(editedAmount);

    return isNaN(parsedValue) || parsedValue <= 0 || parsedValue === originalAmountInDollars;
  }, [editedAmount, originalAmountInDollars]);

  const handleSave = () => {
    const parsedAmount = parseFloatStrictly(editedAmount);

    if (isNaN(parsedAmount)) {
      // Should never happen
      throw new Error('Amount is not a number');
    }

    // Need "Math.round" because "parseFloatStrictly" * 100 can result in numbers like:
    // amount = 9.45 -> formattedAmount * 100 = 944.9999999999999
    // amount = 9.46 -> formattedAmount * 100 = 946.0000000000001
    onUpdateBillingDetails(Math.round(parsedAmount * 100), parsedAmount);
    onEditComplete();
  };

  const handleCancel = () => {
    setEditedAmount(originalAmountInDollars?.toString());
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
                setEditedAmount(filteredValue);
              }}
              inputMode="decimal"
              type="text"
              value={editedAmount}
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
