import PropTypes, { InferProps } from 'prop-types';
import { useTranslation } from 'react-i18next';
import { ContributionPage } from 'hooks/useContributionPage';
import { useImageSource } from 'hooks/useImageSource';
import { Logo, Root } from './DonationPageHeader.styled';

const DonationPageHeaderPropTypes = {
  page: PropTypes.object.isRequired
};

export interface DonationPageHeaderProps extends InferProps<typeof DonationPageHeaderPropTypes> {
  page: ContributionPage;
}

export function DonationPageHeader({ page }: DonationPageHeaderProps) {
  const { t } = useTranslation();
  const logoSource = useImageSource(page.header_logo);
  const backgroundSource = useImageSource(page.header_bg_image);

  // If the logo is linked, we need the logo to have *some* alt text for it to
  // be interactible. As a fallback, we set it to "Logo" (though this is far
  // from ideal). If the image is unlinked, it's fine for it to have blank alt
  // text.

  const altTextWithFallback = page.header_logo_alt_text === '' ? t('common.logo') : page.header_logo_alt_text;
  let logo = null;

  if (logoSource) {
    logo = <Logo src={logoSource} alt={page.header_logo_alt_text} />;

    if (page.header_link) {
      logo = (
        <a href={page.header_link} target="_blank" rel="noreferrer noopener">
          <Logo src={logoSource} alt={altTextWithFallback} />
        </a>
      );
    }
  }

  return <Root $bgImage={backgroundSource}>{logo}</Root>;
}

DonationPageHeader.propTypes = DonationPageHeaderPropTypes;
export default DonationPageHeader;
