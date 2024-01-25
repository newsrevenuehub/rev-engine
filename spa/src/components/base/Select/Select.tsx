import styled from 'styled-components';
import MenuItem from '../MenuItem/MenuItem';
import { ReactNode, forwardRef } from 'react';
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

export const Select = forwardRef<HTMLDivElement, SelectProps>((props, ref) => {
  const { options, ...other } = props;

  return (
    <StyledSelect
      select
      variant="outlined"
      // As a select no InputProps are needed, so we override TextField's default to avoid console errors
      InputProps={{}}
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
