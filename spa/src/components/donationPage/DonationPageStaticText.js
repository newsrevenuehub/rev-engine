import * as S from './DonationPageStaticText.styled';
import { format } from 'date-fns';

import { getTotalAmount } from 'components/paymentProviders/stripe/stripeFns';

function DonationPageStaticText({ page, amount, payFee, frequency }) {
  return (
    <S.DonationPageStaticText data-testid="donation-page-static-text">
      {page.revenue_program.contact_email && (
        <p>
          Have questions or want to change a recurring {page.organization_is_nonprofit ? 'donation' : 'contribution'}?
          Contact us at{' '}
          <a href={`mailto:${page.revenue_program.contact_email}`}>{page.revenue_program.contact_email}</a>.
        </p>
      )}
      {page.revenue_program.address && (
        <p>Prefer to mail a check? Our mailing address is {page.revenue_program.address}.</p>
      )}

      <p>
        Contributions or gifts to {page.revenue_program.name} {page.organization_is_nonprofit ? 'are' : 'are not'} tax
        deductible.
      </p>
      <p>
        By proceeding with this transaction, you agree to our terms & conditions.{' '}
        {frequency !== 'one_time' &&
          `Additionally, by proceeding with this transaction, you're authorizing today's payment, along with all future recurring payments of $${getTotalAmount(
            amount,
            payFee,
            frequency,
            page.organization_is_nonprofit
          )}, to be processed on or adjacent to the ${format(new Date(), 'do')} of the month until you cancel.`}
      </p>
    </S.DonationPageStaticText>
  );
}

export default DonationPageStaticText;
