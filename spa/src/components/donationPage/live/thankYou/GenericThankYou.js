import * as S from './GenericThankYou.styled';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';

// Router
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function GenericThankYou({ setOrgAnalytics }) {
  const { state: routedState } = useLocation();

  const orgGaDomain = routedState?.page?.revenue_program?.org_google_analytics_domain;
  const orgGaId = routedState?.page?.revenue_program?.org_google_analytics_id;

  useEffect(() => {
    setOrgAnalytics(orgGaId, orgGaDomain);
  }, [orgGaDomain, orgGaId]);

  return (
    <SegregatedStyles>
      <S.GenericThankYou data-testid="generic-thank-you">
        <S.ThankYou>
          <h2>
            Thank You <span>for your donation.</span>
          </h2>
          {routedState?.page?.post_thank_you_redirect && (
            <S.Redirect href={routedState?.page?.post_thank_you_redirect}>Take me back to the news</S.Redirect>
          )}
        </S.ThankYou>
      </S.GenericThankYou>
    </SegregatedStyles>
  );
}

export default GenericThankYou;
