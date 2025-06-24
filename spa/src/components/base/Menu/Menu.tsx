import { Menu as MuiMenu, MenuProps as MuiMenuProps } from '@material-ui/core';
import styled from 'styled-components';

export type MenuProps = MuiMenuProps;

// Place the menu 6px below or above the anchor by default.

const StyledMenu = styled(MuiMenu)`
  margin: 6px 0;
`;

export function Menu(props: MenuProps) {
  // Default placement below the anchor, but allow overriding. See
  // https://github.com/mui/material-ui/issues/7961#issuecomment-326215406 for
  // why getContentAnchorEl is needed.

  return (
    <StyledMenu
      anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      anchorPosition={{ left: 0, top: 20 }}
      getContentAnchorEl={null}
      {...props}
    />
  );
}

export default Menu;
