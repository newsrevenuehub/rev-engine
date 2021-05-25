import * as S from './GenericThankYou.styled';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';

// Router
import { useLocation } from 'react-router-dom';

function GenericThankYou() {
  const { state: routedState } = useLocation();

  return (
    <SegregatedStyles>
      <S.GenericThankYou data-testid="generic-thank-you">
        <S.ThankYou>
          <h1>Thank You</h1>
          <h4>for your donation.</h4>
          {routedState?.page?.post_thank_you_redirect && (
            <S.Redirect href={routedState?.page?.post_thank_you_redirect}>Take me back to the news</S.Redirect>
          )}
        </S.ThankYou>
      </S.GenericThankYou>
    </SegregatedStyles>
  );
}

export default GenericThankYou;
