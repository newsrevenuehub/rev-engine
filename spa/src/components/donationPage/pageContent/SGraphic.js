import * as S from './SGraphic.styled';

// Context
import { usePage } from 'components/donationPage/DonationPage';
function SGraphic() {
  const { page } = usePage();

  if (!page.graphic) return null;

  return (
    <S.SGraphicWrapper>
      <S.Graphic src={page?.graphic} />
    </S.SGraphicWrapper>
  );
}

export default SGraphic;
