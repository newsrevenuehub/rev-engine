import * as S from './PageHeading.styled';

function SPageHeading({ heading }) {
  if (!heading) return null;

  return (
    <S.SPageHeading data-testid="s-page-heading">
      <S.Heading>{heading}</S.Heading>
    </S.SPageHeading>
  );
}

SPageHeading.type = 'SPageHeading';
SPageHeading.displayName = 'Page Heading';
SPageHeading.description = 'This is a static element at the top of the contribution section of your page';

export default SPageHeading;
