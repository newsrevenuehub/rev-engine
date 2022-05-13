import { useState, useEffect } from 'react';
import * as S from './LivePage404.styled';

// Analytics
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { HUB_GA_V3_ID } from 'settings';

export const FUNDJOURNALISM_404_REDIRECT = 'https://fundjournalism.org/?utm_campaign=404#donate';

function LivePage404( {dashboard} ) {
  const { setAnalyticsConfig } = useAnalyticsContext();

  useEffect(() => {
    setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID });
  }, [HUB_GA_V3_ID]);

  return (
    <S.LivePage404 data-testid="live-page-404">
      <S.Wrapper>
        <S.FourOhFour>404</S.FourOhFour>
        <S.Description>
          <p>The page you requested can’t be found.</p>
          {dashboard ? null :<p>
            If you’re trying to make a contribution please visit <a href={FUNDJOURNALISM_404_REDIRECT}>this page</a>.{' '}
          </p>
        }
        </S.Description>
      </S.Wrapper>
    </S.LivePage404>
  );
}

export default LivePage404;
