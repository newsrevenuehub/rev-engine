import * as S from './DonationPage.styled';

// Children
import TemporaryStripeCheckoutTest from 'components/TEMP/TemporaryStripeCheckoutTest';

function DonationPage({ page }) {
  return (
    <S.DonationPage data-testid="live-donation-page">
      <h1>{page.title}</h1>
      <p>Page name: {page.name}</p>
      <p>Showing benefits: {page.show_benefits.toString()}</p>
      <p>Org pk: {page.organization}</p>
      <p>Rev program pk: {page.revenue_program}</p>
      <div style={{ margin: '0 auto', maxWidth: '1000px', padding: '0 3rem' }}>
        <TemporaryStripeCheckoutTest />
      </div>
    </S.DonationPage>
  );
}

export default DonationPage;
