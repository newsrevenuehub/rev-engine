import PropTypes from 'prop-types';

import * as S from './DonationPageNavbar.styled';

function DonationPageNavbar({ headerLogo, headerLink, headerBgImage }) {
  const getImageUrl = (img) => {
    if (img instanceof File) {
      return URL.createObjectURL(img);
    } else return img;
  };

  let headerLogoMarkup = null;

  if (headerLogo) {
    headerLogoMarkup = <S.DonationPageNavbarLogo src={getImageUrl(headerLogo)} data-testid="s-header-bar-logo" />;

    if (headerLink) {
      headerLogoMarkup = (
        <a href={headerLink} target="_blank" rel="noreferrer noopener" data-testid="s-header-bar-logo-link">
          <S.DonationPageNavbarLogo src={getImageUrl(headerLogo)} />
        </a>
      );
    }
  }

  return (
    <S.DonationPageNavbar bgImg={getImageUrl(headerBgImage)} data-testid="s-header-bar">
      {headerLogoMarkup}
    </S.DonationPageNavbar>
  );
}

DonationPageNavbar.propTypes = {
  headerLogo: PropTypes.string,
  headerLink: PropTypes.string,
  headerBgImage: PropTypes.string
};

export default DonationPageNavbar;
