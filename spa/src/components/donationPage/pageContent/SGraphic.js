import * as S from './SGraphic.styled';

// Util
import getSrcForImg from 'utilities/getSrcForImg';

// Context
import { usePage } from 'components/donationPage/DonationPage';
function SGraphic() {
  const { page } = usePage();

  if (!page.graphic) return null;

  return (
    <S.SGraphicWrapper data-testid="s-graphic">
      <S.Graphic src={getSrcForImg(page?.graphic)} />
    </S.SGraphicWrapper>
  );
}

export default SGraphic;
