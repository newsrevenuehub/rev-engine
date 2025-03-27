import { usePage } from 'components/donationPage/DonationPage';
import { useImageSource } from 'hooks/useImageSource';
import { Image } from './Graphic.styled';

export function Graphic() {
  const { page } = usePage();
  const src = useImageSource(page?.graphic);

  if (!src) {
    return null;
  }

  return (
    <div data-testid="s-graphic">
      <Image src={src} alt="" />
    </div>
  );
}

export default Graphic;
