import * as S from './LiveErrorFallback.styled';

function LiveErrorFallback(props) {
  return (
    <S.LiveErrorFallback>
      <S.Wrapper>
        <S.FiveHundred>500</S.FiveHundred>
        <S.Description>Something went really wrong. User your browser's back button and try again.</S.Description>
      </S.Wrapper>
    </S.LiveErrorFallback>
  );
}

export default LiveErrorFallback;
