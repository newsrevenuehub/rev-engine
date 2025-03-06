import PropTypes, { InferProps } from 'prop-types';
import { CurrentDot, Dot, Root } from './Progress.styled';
import { Check } from '@material-ui/icons';

const ProgressPropTypes = {
  /**
   * 1-indexed.
   */
  currentStep: PropTypes.number.isRequired,
  totalSteps: PropTypes.number.isRequired
};

export type ProgressProps = InferProps<typeof ProgressPropTypes>;

export function Progress({ currentStep, totalSteps }: ProgressProps) {
  const dots = [];

  for (let i = 1; i <= totalSteps; i++) {
    if (i === currentStep) {
      const final = i === totalSteps;

      dots.push(<CurrentDot $final={final}>{final ? <Check /> : i}</CurrentDot>);
    } else {
      dots.push(<Dot $active={i < currentStep} />);
    }
  }

  return <Root aria-label={`Step ${currentStep} of ${totalSteps}`}>{dots}</Root>;
}

Progress.propTypes = ProgressPropTypes;
export default Progress;
