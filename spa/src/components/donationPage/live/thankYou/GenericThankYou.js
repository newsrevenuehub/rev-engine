import * as S from './GenericThankYou.styled';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';

// Router
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function GenericThankYou({ setOrgAnalytics }) {
  const { state: routedState } = useLocation();

  const orgGaV3Domain = routedState?.page?.revenue_program?.google_analytics_v3_domain;
  const orgGaV3Id = routedState?.page?.revenue_program?.google_analytics_v3_id;

  useEffect(() => {
    setOrgAnalytics(orgGaV3Id, orgGaV3Domain);
  }, [orgGaV3Domain, orgGaV3Id]);

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
