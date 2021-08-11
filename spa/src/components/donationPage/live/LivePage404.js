import { useState, useEffect } from 'react';
import * as S from './LivePage404.styled';

const SHOW_TIMEOUT = 400;

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
        <S.Description>We could not find the page you're looking for.</S.Description>
      </S.Wrapper>
    </S.LivePage404>
  );
}

export default LivePage404;
