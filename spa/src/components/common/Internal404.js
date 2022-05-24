import { useEffect } from 'react';
import * as S from './Internal404.styled';

// Analytics
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { HUB_GA_V3_ID } from 'settings';

function Internal404() {
  const { setAnalyticsConfig } = useAnalyticsContext();

  useEffect(() => {
    setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID });
  }, [HUB_GA_V3_ID]);

  return (
    <S.Internal404 data-testid="internal-404">
      <S.Wrapper>
        <S.FourOhFour>404</S.FourOhFour>
        <S.Description>
          <p>The page you requested can’t be found.</p>
        </S.Description>
      </S.Wrapper>
    </S.Internal404>
  );
}

export default Internal404;
