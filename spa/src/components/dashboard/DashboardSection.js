import * as S from './DashboardSection.styled';

function DashboardSection({ children, heading, ...props }) {
  return (
    <S.DashboardSection {...props}>
      {heading && <S.SectionHeading>{heading}</S.SectionHeading>}
      <S.SectionContent>{children}</S.SectionContent>
    </S.DashboardSection>
  );
}

export default DashboardSection;
