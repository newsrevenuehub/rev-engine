import { Meta, Story } from '@storybook/react';
import Button, { ButtonProps } from './Button';

interface ButtonDemoProps extends ButtonProps {
  label: string;
}

const ButtonDemo = (props: ButtonDemoProps) => {
  const { label, ...other } = props;

  return <Button {...other}>{label}</Button>;
};

export default {
  component: ButtonDemo,
  title: 'Base/Button',
  parameters: {
    docs: {
      description: {
        component: 'A MUI-based button. See [the API](https://v4.mui.com/api/button/) for more details.'
      }
    }
  }
} as Meta;

export const Default: Story<ButtonDemoProps> = ButtonDemo.bind({});
Default.args = { label: 'Hello World' };

export const Disabled: Story<ButtonDemoProps> = ButtonDemo.bind({});
Disabled.args = { disabled: true, label: 'Hello World' };
