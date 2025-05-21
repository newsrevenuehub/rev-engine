import styled from 'styled-components';
import MenuItem from '../MenuItem/MenuItem';
import { ReactNode, forwardRef } from 'react';
import TextField from '../TextField/TextField';
import { OutlinedTextFieldProps } from '@material-ui/core';

export type SelectProps = Omit<OutlinedTextFieldProps, 'variant'> & {
  options: Array<{ label: ReactNode; value: string | number; selectedLabel?: string | null }>;
};

const StyledSelect = styled(TextField)`
  && {
    .NreSelectMenu {
      padding: 9px 32px 9px 12px;
      min-width: 92px;
      box-sizing: border-box;
      color: ${({ theme }) => theme.basePalette.greyscale['70']};
      background-color: ${({ theme }) => theme.basePalette.greyscale.white};

      #menu-label {
        display: none;
      }
      #selected-label {
        display: block;
      }
    }

    .NreSelectFocused .NreSelectNotchedOutline {
      border-color: #00bfdf;
    }
  }
`;

const StyledMenuItem = styled(MenuItem)`
  && {
    font-size: 14px;

    #menu-label {
      display: block;
    }
    #selected-label {
      display: none;
    }
  }
`;

export const Select = forwardRef<HTMLDivElement, SelectProps>((props, ref) => {
  const { options, ...other } = props;

  return (
    <StyledSelect
      select
      variant="outlined"
      // Override focused border color so that no custom style is applied
      InputProps={{
        classes: {
          notchedOutline: 'NreSelectNotchedOutline',
          focused: 'NreSelectFocused'
        }
      }}
      SelectProps={{ classes: { selectMenu: 'NreSelectMenu' } }}
      ref={ref}
      {...other}
    >
      {options.map((item) => (
        <StyledMenuItem key={item.value} value={item.value}>
          <span id="menu-label">{item.label}</span>
          <span id="selected-label">{item.selectedLabel || item.label}</span>
        </StyledMenuItem>
      ))}
    </StyledSelect>
  );
});

export default Select;
