import { Autorenew, Today } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { PaymentStatus } from 'constants/paymentStatus';
import { CardBrand, PortalContribution } from 'hooks/usePortalContributionList';
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
  Status
} from './ContributionItem.styled';

const TransactionItemPropTypes = {
  contribution: PropTypes.object.isRequired
};

export interface ContributionItemProps extends InferProps<typeof TransactionItemPropTypes> {
  contribution: PortalContribution;
}

function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

// Exported for testing only.

export const formattedCardBrands: Record<CardBrand, string> = {
  amex: 'Amex',
  diners: "Diner's",
  discover: 'Discover',
  jcb: 'JCB',
  mastercard: 'MC',
  unionpay: 'UnionPay',
  unknown: '',
  visa: 'Visa'
};

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

export function ContributionItem({ contribution }: ContributionItemProps) {
  // If we end up with an interval we don't know the icon for, fall back to
  // displaying nothing.
  const IntervalIcon = intervalIcons[contribution.interval] ?? (() => null);

  return (
    <Root $dimmed={contribution.status === 'canceled'}>
      <IntervalIconContainer $status={contribution.status}>
        <IntervalIcon aria-label={getFrequencyAdjective(contribution.interval)} />
      </IntervalIconContainer>
      <DateContainer>
        <CreatedDate data-testid="created">{formatDate(contribution.created)}</CreatedDate>
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
        <LastCardDigits data-testid="card-last4">{contribution.last4}</LastCardDigits>
      </CardInfo>
      <Status $status={contribution.status} data-testid="status">
        {formattedStatuses[contribution.status]}
      </Status>
      <Amount $status={contribution.status} data-testid="amount">
        {formatCurrencyAmount(contribution.amount, true)}
      </Amount>
    </Root>
  );
}

ContributionItem.propTypes = TransactionItemPropTypes;
export default ContributionItem;
