import * as S from './SHeaderBar.styled';

// Context
import { usePage } from 'components/donationPage/DonationPage';

function SHeaderBar() {
  const { page } = usePage();

  return (
    <S.SHeaderBar bgImg={page?.header_bg_image} data-testid="s-header-bar">
      <a href={page?.header_link} target="_blank" rel="noreferrer noopener">
        <S.SHeaderLogo src={page?.header_logo} />
      </a>
    </S.SHeaderBar>
  );
}

SHeaderBar.type = 'SHeaderBar';
SHeaderBar.displayName = 'Header Bar';
SHeaderBar.description = 'This is a static element that appears at the top of your Donation Page';

export default SHeaderBar;
