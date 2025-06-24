import { Menu as MuiMenu, MenuProps as MuiMenuProps } from '@material-ui/core';

export type MenuProps = MuiMenuProps;

export function Menu(props: MenuProps) {
  // Default placement below the anchor, but allow overriding. See
  // https://github.com/mui/material-ui/issues/7961#issuecomment-326215406 for
  // why getContentAnchorEl is needed.

  return <MuiMenu anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }} getContentAnchorEl={null} {...props} />;
}

export default Menu;
