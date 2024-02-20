import PropTypes, { InferProps } from 'prop-types';
import AwardIcon from 'assets/icons/award_star.svg?react';
import { Root } from './FeatureBadge.styled';

const FeatureBadgePropTypes = {
  className: PropTypes.string,
  type: PropTypes.oneOf(['CORE', 'CUSTOM']).isRequired
};

export interface FeatureBadgeProps extends InferProps<typeof FeatureBadgePropTypes> {
  type: 'CORE' | 'CUSTOM';
}

export function FeatureBadge({ className, type }: FeatureBadgeProps) {
  const text = {
    CORE: 'Core Feature',
    CUSTOM: 'Custom Feature'
  }[type];

  return (
    <Root className={className!} $type={type}>
      <AwardIcon />
      {text}
    </Root>
  );
}

FeatureBadge.propTypes = FeatureBadgePropTypes;
export default FeatureBadge;
