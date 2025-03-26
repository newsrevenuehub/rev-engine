import PropTypes, { InferProps } from 'prop-types';
import HeaderSection from 'components/common/HeaderSection';
import { CornerContent, Root } from './Hero.styled';

const HeroPropTypes = {
  title: PropTypes.string.isRequired,
  cornerContent: PropTypes.node,
  subtitle: PropTypes.string,
  className: PropTypes.string
};

export type HeroProps = InferProps<typeof HeroPropTypes>;

const Hero = ({ className, title, subtitle, cornerContent }: HeroProps) => {
  return (
    <Root className={className ?? ''}>
      <HeaderSection title={title} subtitle={subtitle} />
      {cornerContent && <CornerContent data-testid="corner-content">{cornerContent}</CornerContent>}
    </Root>
  );
};

Hero.propTypes = HeroPropTypes;

export default Hero;
