import { MobileStepper } from '@material-ui/core';
import styled from 'styled-components';

const StyledMobileStepper = styled(MobileStepper)`
  && {
    background: none;
    justify-content: center;
    padding: 0;

    .MuiMobileStepper-dot {
      background-color: rgb(82, 58, 94);
      height: 16px;
      margin: 0;
      position: relative;
      width: 16px;

      + .MuiMobileStepper-dot {
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

    .MuiMobileStepper-dotActive ~ .MuiMobileStepper-dot {
      background-color: rgb(221, 203, 231);
    }
  }
`;

/**
 * A set of noninteractive dots indicating progress through a multi-step process.
 * @see https://v4.mui.com/api/mobile-stepper/
 */
export const StepperDots = (props) => <StyledMobileStepper position="static" variant="dots" {...props} />;

StepperDots.propTypes = MobileStepper.propTypes;

export default StepperDots;
