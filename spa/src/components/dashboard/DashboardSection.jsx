import * as S from './DashboardSection.styled';
import { accordionAnimation } from 'components/content/pages/Pages.styled';
import PropTypes from 'prop-types';

function DashboardSection({ children, heading, ...props }) {
  return (
    <S.DashboardSection {...props} layout>
      <S.SectionHeading layout>{heading && <h2>{heading}</h2>}</S.SectionHeading>
      <S.SectionContent layout {...accordionAnimation}>
        {children}
      </S.SectionContent>
    </S.DashboardSection>
  );
}

DashboardSection.propTypes = {
  heading: PropTypes.string
};

export default DashboardSection;
