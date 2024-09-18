import { Checkbox, FormControlLabel } from 'components/base';
import { ContributionInterval } from 'constants/contributionIntervals';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import PropTypes, { InferProps } from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import { parseFloatStrictly } from 'utilities/parseFloatStrictly';
import { Columns, Detail, SectionControlButton, Subheading } from '../common.styled';
import { DetailSection } from '../DetailSection';
import DetailSectionEditControls from '../DetailSection/DetailSectionEditControls';
import { CheckboxLabel, StartInputAdornment, StyledTextField } from './BillingDetails.styled';

const BillingDetailsPropTypes = {
  contribution: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
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

// This will eventually have an editable state.

export function BillingDetails({
  contribution,
  disabled,
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
    const onlyZeroOrDotRegex = /^[0.]+$/;

    const isSame = amount === amountInDollars?.toString();
    const isEmpty = !amount;
    const isOnlyZero = !!onlyZeroOrDotRegex.exec(amount);

    const parsedValue = parseFloatStrictly(amount);
    const isValid = !isNaN(parsedValue) && parsedValue > 0;

    return isSame || isEmpty || isOnlyZero || !isValid;
  }, [amount, amountInDollars]);

  const handleSave = () => {
    // Amount will be a valid number at this point and we need to convert it to cents
    onUpdateBillingDetails(parseFloatStrictly(amount) * 100);
    onEditComplete();
  };

  useEffect(() => {
    // Only sync amount if "editable" switches to true
    if (editable) {
      setAmount(amountInDollars?.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable]);

  const controls = editable ? (
    <DetailSectionEditControls disabled={disableSave} onCancel={onEditComplete} onSave={handleSave} />
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
      controls={contribution.is_modifiable && controls}
    >
      <Columns>
        <div>
          {editable ? (
            <StyledTextField
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
