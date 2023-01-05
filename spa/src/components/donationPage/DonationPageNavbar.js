import { useEffect, useState } from 'react';
import fileToDataUrl from 'utilities/fileToDataUrl';
import * as S from './DonationPageNavbar.styled';

function DonationPageNavbar({ page }) {
  const [headerLogoSrc, setHeaderLogoSrc] = useState('');
  const [headerBgSrc, setHeaderBgSrc] = useState('');

  // If the user has set new images on either of these properties in the page,
  // they will exist there as files, not string URLs.

  useEffect(() => {
    async function run() {
      if (page?.header_logo instanceof File) {
        setHeaderLogoSrc(await fileToDataUrl(page?.header_logo));
      } else {
        setHeaderLogoSrc(page?.header_logo);
      }
    }

    run();
  }, [page?.header_logo]);

  useEffect(() => {
    async function run() {
      if (page?.header_bg_image instanceof File) {
        setHeaderBgSrc(await fileToDataUrl(page?.header_bg_image));
      } else {
        setHeaderBgSrc(page?.header_bg_image);
      }
    }

    run();
  }, [page?.header_bg_image]);

  let headerLogoMarkup = null;

  if (headerLogoSrc) {
    headerLogoMarkup = <S.DonationPageNavbarLogo src={headerLogoSrc} data-testid="s-header-bar-logo" />;

    if (page?.header_link) {
      headerLogoMarkup = (
        <a href={page?.header_link} target="_blank" rel="noreferrer noopener" data-testid="s-header-bar-logo-link">
          <S.DonationPageNavbarLogo src={headerLogoSrc} />
        </a>
      );
    }
  }

  return (
    <S.DonationPageNavbar bgImg={headerBgSrc} data-testid="s-header-bar">
      {headerLogoMarkup}
    </S.DonationPageNavbar>
  );
}

export default DonationPageNavbar;
