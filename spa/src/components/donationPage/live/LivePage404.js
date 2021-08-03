import * as S from './LivePage404.styled';

function LivePage404(props) {
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
