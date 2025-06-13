import PropTypes, { InferProps } from 'prop-types';
import { Title, Subtitle, Root } from './HeaderSection.styled';

const HeaderSectionPropTypes = {
  className: PropTypes.string,
  subtitle: PropTypes.node,
  title: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['dark'])
};

export interface HeaderSectionProps extends InferProps<typeof HeaderSectionPropTypes> {
  variant?: 'dark';
}

const HeaderSection = ({ title, subtitle, className, variant }: HeaderSectionProps) => (
  <Root className={className ?? undefined} $variant={variant}>
    <Title>{title}</Title>
    {subtitle && <Subtitle data-testid="subtitle">{subtitle}</Subtitle>}
  </Root>
);

HeaderSection.propTypes = HeaderSectionPropTypes;
export default HeaderSection;
