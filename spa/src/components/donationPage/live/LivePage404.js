import { useState, useEffect } from 'react';
import * as S from './LivePage404.styled';

const SHOW_TIMEOUT = 400;
export const FUNDJOURNALISM_404_REDIRECT = 'https://fundjournalism.org/?utm_campaign=404#donate';

function LivePage404() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    let timeout = setTimeout(() => {
      setShouldShow(true);
    }, SHOW_TIMEOUT);
    return () => clearTimeout(timeout);
  }, []);

  if (!shouldShow) return null;

  return (
    <S.LivePage404 data-testid="live-page-404">
      <S.Wrapper>
        <S.FourOhFour>404</S.FourOhFour>
        <S.Description>
          <p>The page you requested can’t be found.</p>
          <p>
            If you’re trying to make a contribution please visit <a href={FUNDJOURNALISM_404_REDIRECT}>this page</a>.{' '}
          </p>
        </S.Description>
      </S.Wrapper>
    </S.LivePage404>
  );
}

export default LivePage404;
