import PropTypes, { InferProps } from 'prop-types';

import { H2, Subtitle, Flex } from './SubheaderSection.styled';

export type SubheaderSectionProps = InferProps<typeof SubheaderSectionPropTypes>;

const SubheaderSection = ({ title, subtitle, className, hideBottomDivider }: SubheaderSectionProps) => (
  <Flex className={className!} $hideBottomDivider={hideBottomDivider!}>
    <H2>{title}</H2>
    {subtitle && <Subtitle data-testid="subheader-subtitle">{subtitle}</Subtitle>}
  </Flex>
);

const SubheaderSectionPropTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  className: PropTypes.string,
  hideBottomDivider: PropTypes.bool
};

SubheaderSection.propTypes = SubheaderSectionPropTypes;

SubheaderSection.defaultProps = {
  hideBottomDivider: false,
  className: ''
};

export default SubheaderSection;
