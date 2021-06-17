import * as S from './SPageHeading.styled';

// Context
import { usePage } from 'components/donationPage/DonationPage';

function SPageHeading() {
  const { page } = usePage();

  if (!page?.heading) return null;

  return (
    <S.SPageHeading data-testid="s-page-heading">
      <S.Heading>{page.heading}</S.Heading>
    </S.SPageHeading>
  );
}

SPageHeading.type = 'SPageHeading';
SPageHeading.displayName = 'Page Heading';
SPageHeading.description = 'This is a static element at the top of the donation section of your page';

export default SPageHeading;
