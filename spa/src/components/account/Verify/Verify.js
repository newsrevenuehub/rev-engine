import * as S from './Verify.styled';

function Verify({ onSuccess, message }) {
  return (
    <S.Verify>
      <S.Outer>
        <S.Left>aa</S.Left>
        <S.Right>
          <div class="centered">centered</div>
        </S.Right>
      </S.Outer>
      <div class="bottombar">bottom</div>
    </S.Verify>
  );
}

export default Verify;
