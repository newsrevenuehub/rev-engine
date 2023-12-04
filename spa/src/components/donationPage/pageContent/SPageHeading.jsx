import { SPageHeadingWrapper, Heading } from './SPageHeading.styled';

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
SPageHeading.displayName = 'Page Heading';
SPageHeading.description = 'This is a static element at the top of the contribution section of your page';

export default SPageHeading;
