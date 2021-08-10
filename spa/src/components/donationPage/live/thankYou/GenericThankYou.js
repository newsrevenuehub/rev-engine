import * as S from './GenericThankYou.styled';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';

// Router
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function GenericThankYou({ setOrgAnalytics }) {
  const { state: routedState } = useLocation();

  const orgGaV3Domain = routedState?.page?.revenue_program?.google_analytics_v3_domain;
  const orgGaV3Id = routedState?.page?.revenue_program?.google_analytics_v3_id;
  const orgGaV4Id = routedState?.page?.revenue_program?.google_analytics_v4_id;
  const fbPixelId = routedState?.page?.revenue_program?.facebook_pixel_id;

  useEffect(() => {
    setOrgAnalytics(orgGaV3Id, orgGaV3Domain, orgGaV4Id, fbPixelId);
  }, [orgGaV3Domain, orgGaV3Id, orgGaV4Id, fbPixelId]);

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
