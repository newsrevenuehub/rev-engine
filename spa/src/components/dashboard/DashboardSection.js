import * as S from './DashboardSection.styled';
import PropTypes from 'prop-types';

function DashboardSection({ children, heading, collapsible, ...props }) {
  return (
    <S.DashboardSection {...props} layout>
      {heading && <S.SectionHeading layout>{heading}</S.SectionHeading>}
      <S.SectionContent layout>{children}</S.SectionContent>
    </S.DashboardSection>
  );
}

DashboardSection.propTypes = {
  heading: PropTypes.string,
  /** Whether or not clicking the heading section will collapse content */
  collapsible: PropTypes.bool
};

DashboardSection.defaultProps = {
  collapsible: false
};

export default DashboardSection;
