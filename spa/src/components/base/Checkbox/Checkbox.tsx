import { Checkbox as MuiCheckbox, CheckboxProps as MuiCheckboxProps } from '@material-ui/core';
import styled from 'styled-components';

export type CheckboxProps = MuiCheckboxProps;

/**
 * @see https://v4.mui.com/components/checkboxes/#checkbox
 */
export const Checkbox = styled(MuiCheckbox)`
  && {
    padding: 0 9px;

    &.Mui-checked {
      color: ${({ theme }) => theme.basePalette.primary.engineBlue};

      &.Mui-disabled {
        color: ${({ theme }) => theme.basePalette.greyscale['30']};
      }
    }

    svg {
      height: 24px;
      width: 24px;
    }
  }
`;

export default Checkbox;
