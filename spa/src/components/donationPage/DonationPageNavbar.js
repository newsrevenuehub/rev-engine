import * as S from './DonationPageNavbar.styled';

function DonationPageNavbar({ page }) {
  const getImageUrl = (img) => {
    if (img instanceof File) {
      return URL.createObjectURL(img);
    } else return img;
  };

  return (
    <S.DonationPageNavbar data-testid="s-header-bar">
      <a href={page?.header_link} target="_blank" rel="noreferrer noopener">
        <S.DonationPageNavbarLogo src={getImageUrl(page?.header_logo)} />
      </a>
    </S.DonationPageNavbar>
  );
}

export default DonationPageNavbar;
