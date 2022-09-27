import { Button as MuiButton } from '@material-ui/core';
import { forwardRef } from 'react';
import styled from 'styled-components';

const StyledMuiButton = styled(MuiButton)`
  && {
    background-color: rgb(245, 255, 117);
    box-shadow: 0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2);
    border: 1px solid rgb(230, 238, 132);
    padding: 16px;

    .MuiButton-label {
      color: rgb(48, 36, 54);
      font: 600 14px Roboto, sans-serif;
    }
  }

  &&:hover {
    background-color: rgb(245, 255, 117);
  }

  &&.Mui-disabled {
    background-color: rgb(230, 238, 132);

    .MuiButton-label {
      color: rgb(138, 127, 143);
    }
  }
`;

/**
 * @see https://v4.mui.com/api/button/
 */
export const Button = forwardRef((props, ref) => <StyledMuiButton ref={ref} variant="contained" {...props} />);

Button.propTypes = MuiButton.propTypes;

export default Button;
