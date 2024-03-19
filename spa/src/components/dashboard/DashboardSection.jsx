import PropTypes from 'prop-types';
import { accordionAnimation } from 'components/content/pages/Pages.styled';
import { Root, SectionContent, SectionHeading } from './DashboardSection.styled';

function DashboardSection({ children, heading, ...props }) {
  return (
    <Root {...props} layout>
      <SectionHeading layout>{heading && <h2>{heading}</h2>}</SectionHeading>
      <SectionContent layout {...accordionAnimation}>
        {children}
      </SectionContent>
    </Root>
  );
}

DashboardSection.propTypes = {
  heading: PropTypes.string
};

export default DashboardSection;
