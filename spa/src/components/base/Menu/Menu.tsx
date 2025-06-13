import { Menu as MuiMenu, MenuProps as MuiMenuProps } from '@material-ui/core';

export type MenuProps = MuiMenuProps;

export function Menu(props: MenuProps) {
  return <MuiMenu {...props} />;
}

export default Menu;
