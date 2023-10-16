import { SPageHeadingWrapper, Heading } from './SPageHeading.styled';
import i18n from 'i18n';

// Context
import { usePage } from 'components/donationPage/DonationPage';

function SPageHeading() {
  const { page } = usePage();

  if (!page?.heading) return null;

  return (
    <SPageHeadingWrapper data-testid="s-page-heading">
      <Heading>{page.heading}</Heading>
    </SPageHeadingWrapper>
  );
}

SPageHeading.type = 'SPageHeading';
SPageHeading.displayName = i18n.t('donationPage.sPageHeading.pageHeading');
SPageHeading.description = i18n.t('donationPage.sPageHeading.headingDescription');

export default SPageHeading;
