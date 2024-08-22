import PropTypes, { InferProps } from 'prop-types';
import { Checkbox, FormControlLabel } from 'components/base';
import { ContributionInterval } from 'constants/contributionIntervals';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import { CheckboxLabel } from './BillingDetails.styled';
import { Columns, Detail, Subheading } from '../common.styled';
import { DetailSection } from '../DetailSection';

const BillingDetailsPropTypes = {
  contribution: PropTypes.object.isRequired,
  disabled: PropTypes.bool
};

export interface BillingDetailsProps extends InferProps<typeof BillingDetailsPropTypes> {
  contribution: PortalContributionDetail;
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

export function BillingDetails({ contribution, disabled }: BillingDetailsProps) {
  const formattedDate = Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).format(
    // TODO in DEV-5138: use only first_payment_date
    new Date(contribution.first_payment_date ?? contribution.created)
  );

  return (
    <DetailSection disabled={disabled} title="Billing Details">
      <Columns>
        <div>
          <Subheading>Amount</Subheading>
          <Detail data-testid="amount">{formatCurrencyAmount(contribution.amount)}</Detail>
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
