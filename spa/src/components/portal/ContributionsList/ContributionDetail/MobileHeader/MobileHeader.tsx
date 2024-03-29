import PropTypes, { InferProps } from 'prop-types';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import { Amount, PaymentDate, NextPaymentDate, Root } from './MobileHeader.styled';

const MobileHeaderPropTypes = {
  contribution: PropTypes.object.isRequired
};

export interface MobileHeaderProps extends InferProps<typeof MobileHeaderPropTypes> {
  contribution: PortalContributionDetail;
}

function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function MobileHeader({ contribution }: MobileHeaderProps) {
  return (
    <Root>
      <div>
        <PaymentDate data-testid="created">{formatDate(contribution.created)}</PaymentDate>
        <NextPaymentDate data-testid="next_payment_date">
          {contribution.next_payment_date ? (
            <>
              Next contribution <strong>{formatDate(contribution.next_payment_date)}</strong>
            </>
          ) : (
            <>No future contribution</>
          )}
        </NextPaymentDate>
      </div>
      <Amount data-testid="amount">{formatCurrencyAmount(contribution.amount)}</Amount>
    </Root>
  );
}

MobileHeader.propTypes = MobileHeaderPropTypes;
export default MobileHeader;
