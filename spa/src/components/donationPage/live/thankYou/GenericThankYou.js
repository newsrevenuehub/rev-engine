import * as S from './GenericThankYou.styled';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';

// Router
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

// Analytics
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { HUB_GA_V3_ID } from 'constants/analyticsConstants';

function GenericThankYou() {
  const { state: routedState } = useLocation();
  const { setAnalyticsConfig } = useAnalyticsContext();
  const orgGaV3Domain = routedState?.page?.revenue_program?.google_analytics_v3_domain;
  const orgGaV3Id = routedState?.page?.revenue_program?.google_analytics_v3_id;
  const orgGaV4Id = routedState?.page?.revenue_program?.google_analytics_v4_id;
  const orgFbPixelId = routedState?.page?.revenue_program?.facebook_pixel_id;

  useEffect(() => {
    setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId });
  }, [orgGaV3Domain, orgGaV3Id, orgGaV4Id, orgFbPixelId]);

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
