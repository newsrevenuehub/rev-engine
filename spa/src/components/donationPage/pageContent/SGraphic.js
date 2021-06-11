import * as S from './SGraphic.styled';

// Context
import { usePage } from 'components/donationPage/DonationPage';
function SGraphic() {
  const { page } = usePage();

  if (!page.graphic) return null;

  return (
    <S.SGraphicWrapper data-testid="s-graphic">
      <S.Graphic src={page?.graphic} />
    </S.SGraphicWrapper>
  );
}

export default SGraphic;
