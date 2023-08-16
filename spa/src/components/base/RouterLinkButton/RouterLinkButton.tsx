import { ButtonProps as MuiButtonProps } from '@material-ui/core';
import { Link } from 'react-router-dom';
import { Button, ButtonProps } from '../Button/Button';

export interface RouterLinkButtonProps
  extends Omit<MuiButtonProps<Link, { component: Link }>, 'color' | 'component' | 'size'> {
  color?: ButtonProps['color'];
  size?: ButtonProps['size'];
}

export function RouterLinkButton(props: RouterLinkButtonProps) {
  // This cast seems to be necessary because TypeScript sees ButtonProps as
  // extending `<button>`, which is incompatible with `<a>` since they have
  // different HTML attributes.

  const LooseButton = Button as any;

  return <LooseButton component={Link} {...props} />;
}

export default RouterLinkButton;
