import PropTypes, { InferProps } from 'prop-types';
import { Checkbox, FormControlLabel } from 'components/base';
import { ContributionInterval } from 'constants/contributionIntervals';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import { CheckboxLabel } from './BillingDetails.styled';
import { Columns, Detail, Heading, Subheading } from './common.styled';

const BillingDetailsPropTypes = {
  contribution: PropTypes.object.isRequired
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

export function BillingDetails({ contribution }: BillingDetailsProps) {
  const formattedDate = Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(contribution.created)
  );

  return (
    <>
      <Heading>Billing Details</Heading>
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
          <Detail data-testid="created">{formattedDate}</Detail>
        </div>
        <div>
          <Subheading>Frequency</Subheading>
          <Detail data-testid="frequency">{INTERVAL_NAMES[contribution.interval]}</Detail>
        </div>
      </Columns>
    </>
  );
}

BillingDetails.propTypes = BillingDetailsPropTypes;
export default BillingDetails;
