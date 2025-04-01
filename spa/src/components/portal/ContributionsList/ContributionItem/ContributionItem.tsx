import { Autorenew, Today } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { formattedCardBrands } from 'constants/creditCard';
import { PaymentStatus } from 'constants/paymentStatus';
import { PortalContribution } from 'hooks/usePortalContributionList';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import {
  Amount,
  CardInfo,
  CreatedDate,
  DateContainer,
  IntervalIconContainer,
  LastCardDigits,
  NextContributionDate,
  Root,
  SelectedArrow,
  Status
} from './ContributionItem.styled';
import { forwardRef } from 'react';
import { PORTAL } from 'routes';

const ContributionItemPropTypes = {
  contribution: PropTypes.any.isRequired,
  replaceHistory: PropTypes.bool,
  selected: PropTypes.bool
};

export interface ContributionItemProps extends InferProps<typeof ContributionItemPropTypes> {
  contribution: PortalContribution;
}

function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

// Exported for testing only.

export const formattedStatuses: Record<PaymentStatus, string> = {
  canceled: 'Canceled',
  failed: 'Failed',
  paid: 'Successful',
  processing: 'Processing',
  // These statuses will never be present in results returned by the API.
  flagged: '',
  rejected: ''
};

const intervalIcons = {
  one_time: Today,
  month: Autorenew,
  year: Autorenew
};

export const ContributionItem = forwardRef<HTMLAnchorElement, ContributionItemProps>(
  ({ contribution, replaceHistory, selected }, ref) => {
    // If we end up with an interval we don't know the icon for, fall back to
    // displaying nothing.
    const IntervalIcon = intervalIcons[contribution.interval] ?? (() => null);

    return (
      <Root
        $dimmed={contribution.status === 'canceled'}
        aria-selected={selected ? true : undefined}
        data-testid="contribution-item"
        ref={ref}
        replace={!!replaceHistory}
        to={selected ? PORTAL.CONTRIBUTIONS : `/portal/my-contributions/${contribution.id}/`}
      >
        <IntervalIconContainer $status={contribution.status}>
          <IntervalIcon aria-label={getFrequencyAdjective(contribution.interval)} />
        </IntervalIconContainer>
        <DateContainer>
          <CreatedDate data-testid="first-payment-date">
            {contribution.first_payment_date ? formatDate(contribution.first_payment_date) : '---'}
          </CreatedDate>
          <NextContributionDate $status={contribution.status} data-testid="next-payment-date">
            {contribution.next_payment_date ? (
              <>
                Next contribution <strong>{formatDate(contribution.next_payment_date)}</strong>
              </>
            ) : (
              <>No future contribution</>
            )}
          </NextContributionDate>
        </DateContainer>
        <CardInfo>
          <span data-testid="card-brand">{formattedCardBrands[contribution.card_brand]}</span>{' '}
          <LastCardDigits data-testid="card-last4">{contribution.card_last_4}</LastCardDigits>
        </CardInfo>
        <Status $status={contribution.status} data-testid="status">
          {formattedStatuses[contribution.status]}
        </Status>
        <Amount $status={contribution.status} data-testid="amount">
          {formatCurrencyAmount(contribution.amount, true)}
        </Amount>
        {selected && <SelectedArrow />}
      </Root>
    );
  }
);

ContributionItem.propTypes = ContributionItemPropTypes;
export default ContributionItem;
