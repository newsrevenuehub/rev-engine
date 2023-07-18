import PropTypes, { InferProps } from 'prop-types';
import { useEffect, useState } from 'react';
import { ContributionPage } from 'hooks/useContributionPage';
import fileToDataUrl from 'utilities/fileToDataUrl';
import { Logo, Root } from './DonationPageHeader.styled';

const DonationPageHeaderPropTypes = {
  page: PropTypes.object.isRequired
};

export interface DonationPageHeaderProps extends InferProps<typeof DonationPageHeaderPropTypes> {
  page: ContributionPage;
}

export function DonationPageHeader({ page }: DonationPageHeaderProps) {
  const [logoSource, setLogoSource] = useState<string | null>();
  const [backgroundSource, setBackgroundSource] = useState<string | null>();

  // If the logo is linked, we needt the logo to have *some* alt text for it to
  // be interactible. As a fallback, we set it to "Logo" (though this is far
  // from ideal). If the image is unlinked, it's fine for it to have blank alt text.

  const altTextWithFallback = page.header_logo_alt_text === '' ? 'Logo' : page.header_logo_alt_text;

  // If the user has set new images on either of these properties in the page,
  // they will exist there as files, not string URLs.

  useEffect(() => {
    async function run() {
      if (page.header_logo instanceof File) {
        setLogoSource(await fileToDataUrl(page.header_logo));
      } else {
        setLogoSource(page.header_logo);
      }
    }

    run();
  }, [page.header_logo]);

  useEffect(() => {
    async function run() {
      if (page.header_bg_image instanceof File) {
        setBackgroundSource(await fileToDataUrl(page.header_bg_image));
      } else {
        setBackgroundSource(page.header_bg_image);
      }
    }

    run();
  }, [page.header_bg_image]);

  let logo = null;

  if (logoSource) {
    logo = <Logo src={logoSource} alt={page.header_logo_alt_text} />;

    if (page.header_link) {
      logo = (
        <a href={page?.header_link} target="_blank" rel="noreferrer noopener">
          <Logo src={logoSource} alt={altTextWithFallback} />
        </a>
      );
    }
  }

  return <Root $bgImage={backgroundSource}>{logo}</Root>;
}

DonationPageHeader.propTypes = DonationPageHeaderPropTypes;
export default DonationPageHeader;
