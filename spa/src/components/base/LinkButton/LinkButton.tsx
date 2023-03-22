import { ButtonProps as MuiButtonProps } from '@material-ui/core';
import { Button, ButtonProps } from '../Button/Button';

export interface LinkButtonProps extends Omit<MuiButtonProps<'a', { component: 'a' }>, 'color' | 'component' | 'size'> {
  color?: ButtonProps['color'];
  size?: ButtonProps['size'];
}

export function LinkButton(props: LinkButtonProps) {
  // This cast seems to be necessary because TypeScript sees ButtonProps as
  // extending `<button>`, which is incompatible with `<a>` since they have
  // different HTML attributes.

  const LooseButton = Button as any;

  return <LooseButton component="a" {...props} />;
}

export default LinkButton;
