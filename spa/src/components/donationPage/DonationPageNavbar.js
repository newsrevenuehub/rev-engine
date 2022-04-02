import * as S from './DonationPageNavbar.styled';

function DonationPageNavbar({ page }) {
  const getImageUrl = (img) => {
    if (img instanceof File) {
      return URL.createObjectURL(img);
    } else return img;
  };

  let headerLogoMarkup = null;

  if (page?.header_logo) {
    headerLogoMarkup = <S.DonationPageNavbarLogo src={getImageUrl(page?.header_logo)} />;

    if (page?.header_link) {
      headerLogoMarkup = (
        <a href={page?.header_link} target="_blank" rel="noreferrer noopener">
          <S.DonationPageNavbarLogo src={getImageUrl(page?.header_logo)} />
        </a>
      );
    }
  }

  return (
    <S.DonationPageNavbar bgImg={getImageUrl(page?.header_bg_image)} data-testid="s-header-bar">
      {headerLogoMarkup}
    </S.DonationPageNavbar>
  );
}

export default DonationPageNavbar;
