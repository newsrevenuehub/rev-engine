import PropTypes from 'prop-types';

import { H1, Subtitle } from './HeaderSection.styled';

const HeaderSection = ({ title, subtitle, className }) => (
  <div className={className}>
    <H1>{title}</H1>
    {subtitle && <Subtitle data-testid="subtitle">{subtitle}</Subtitle>}
  </div>
);

HeaderSection.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  className: PropTypes.string
};

HeaderSection.defaultProps = {
  subtitle: undefined,
  className: ''
};

export default HeaderSection;
