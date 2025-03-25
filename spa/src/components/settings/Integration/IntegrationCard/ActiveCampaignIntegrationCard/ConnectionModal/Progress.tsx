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

      dots.push(
        <CurrentDot data-testid="dot-current" key={i} $final={final}>
          {final ? <Check data-testid="dot-current-check" /> : i}
        </CurrentDot>
      );
    } else {
      dots.push(
        <Dot data-testid={`dot-${i < currentStep ? 'active' : 'inactive'}`} key={i} $active={i < currentStep} />
      );
    }
  }

  return (
    <Root
      role="progressbar"
      aria-valuemin={1}
      aria-valuenow={currentStep}
      aria-valuemax={totalSteps}
      aria-label={`Step ${currentStep} of ${totalSteps}`}
    >
      {dots}
    </Root>
  );
}

Progress.propTypes = ProgressPropTypes;
export default Progress;
