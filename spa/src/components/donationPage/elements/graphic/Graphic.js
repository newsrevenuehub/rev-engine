import * as S from './Graphic.styled';

// Util
import getSrcForImg from 'utilities/getSrcForImg';

function Graphic({ graphic }) {
  if (!graphic) return null;

  return (
    <S.SGraphicWrapper data-testid="s-graphic">
      <S.Graphic src={getSrcForImg(graphic)} />
    </S.SGraphicWrapper>
  );
}

export default Graphic;
