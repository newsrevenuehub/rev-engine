import { MenuItem as MuiMenuItem, MenuItemProps as MuiMenuItemProps } from '@material-ui/core';
import styled from 'styled-components';
import { forwardRef } from 'react';

export type MenuItemProps = MuiMenuItemProps;

// This type is needed because it looks like passing things through Styled
// Components causes a type issue with the `button` prop.

interface MenuItemPropsCoercedButton extends Omit<MuiMenuItemProps, 'button'> {
  button: true | undefined;
}

const StyledMenuItem = styled(MuiMenuItem)`
  && {
    margin: 4px;
    border-radius: 4px;
  }
`;

export const MenuItem = forwardRef<HTMLLIElement, MenuItemProps>((props, ref) => {
  return <StyledMenuItem ref={ref} {...(props as MenuItemPropsCoercedButton)} />;
});

export default MenuItem;
