import * as S from './SGraphic.styled';
import { usePage } from 'components/donationPage/DonationPage';
import { useEffect, useState } from 'react';
import fileToDataUrl from 'utilities/fileToDataUrl';

function SGraphic() {
  const { page } = usePage();
  const [graphicSrc, setGraphicSrc] = useState('');

  // If the user has set a new image on the graphic, it will exist in context as
  // a file instead of a string URL.

  useEffect(() => {
    async function run() {
      if (page?.graphic instanceof File) {
        setGraphicSrc(await fileToDataUrl(page?.graphic));
      } else {
        setGraphicSrc(page?.graphic);
      }
    }

    run();
  }, [page?.graphic]);

  if (!graphicSrc) {
    return null;
  }

  return (
    <S.SGraphicWrapper data-testid="s-graphic">
      <S.Graphic src={graphicSrc} alt="" />
    </S.SGraphicWrapper>
  );
}

export default SGraphic;
