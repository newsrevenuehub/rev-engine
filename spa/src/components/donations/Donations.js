import * as S from './Donations.styled';
import TemporaryStripeCheckoutTest from 'components/TEMP/TemporaryStripeCheckoutTest';

function Donations() {
  return (
    <S.Donations data-testid="donations">
      <S.DonationsSection>
        <TemporaryStripeCheckoutTest />
      </S.DonationsSection>
    </S.Donations>
  );
}

export default Donations;
