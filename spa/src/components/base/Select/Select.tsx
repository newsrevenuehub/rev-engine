import styled from 'styled-components';
// import { Select as MuiSelect, SelectProps as MuiSelectProps } from '@material-ui/core';
import MenuItem from '../MenuItem/MenuItem';
import { ReactNode } from 'react';
import TextField, { TextFieldProps } from '../TextField/TextField';

export type SelectProps = TextFieldProps & {
  options: Array<{ label: ReactNode; value: string | number; selectedLabel?: string | null }>;
};

const StyledSelect = styled(TextField)`
  && {
    .NreSelectMenu {
      padding: 9px 32px 9px 12px;
      min-width: 92px;
      box-sizing: border-box;
      color: #707070;
      background-color: #f9f9f9;

      #menu-label {
        display: none;
      }
      #selected-label {
        display: block;
      }
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

export function Select(props: SelectProps) {
  const { options, ...other } = props;

  return (
    <StyledSelect select variant="outlined" SelectProps={{ classes: { selectMenu: 'NreSelectMenu' } }} {...other}>
      {options.map((item) => (
        <StyledMenuItem key={item.value} value={item.value}>
          <span id="menu-label">{item.label}</span>
          <span id="selected-label">{item.selectedLabel || item.label}</span>
        </StyledMenuItem>
      ))}
    </StyledSelect>
  );
}

export default Select;
