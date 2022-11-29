import { MobileStepper, MobileStepperProps } from '@material-ui/core';
import styled from 'styled-components';

const StyledMobileStepper = styled(MobileStepper)`
  && {
    background: none;
    justify-content: center;
    padding: 0;

    .NreMobileStepperDot {
      background-color: rgb(82, 58, 94);
      height: 16px;
      margin: 0;
      position: relative;
      width: 16px;

      + .NreMobileStepperDot {
        margin-left: 14px;

        &::before {
          /* Line between dots. */
          background: rgb(221, 203, 231);
          border-radius: 4px;
          content: '';
          display: block;
          height: 2px;
          left: -12px;
          position: absolute;
          top: 7px;
          width: 10px;
        }
      }
    }

    .NreMobileStepperDotActive ~ .NreMobileStepperDot {
      background-color: rgb(221, 203, 231);
    }
  }
`;

export type StepperDotsProps = Omit<MobileStepperProps, 'backButton' | 'nextButton'>;

/**
 * A set of noninteractive dots indicating progress through a multi-step process.
 * @see https://v4.mui.com/api/mobile-stepper/
 */
export const StepperDots = (props: StepperDotsProps) => (
  <StyledMobileStepper
    backButton={null}
    classes={{ dotActive: 'NreMobileStepperDotActive', dot: 'NreMobileStepperDot' }}
    nextButton={null}
    position="static"
    variant="dots"
    {...props}
  />
);

export default StepperDots;
