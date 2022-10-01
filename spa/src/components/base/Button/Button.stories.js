import Button from './Button';

const ButtonDemo = (props) => {
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
};

export const Default = ButtonDemo.bind({});
Default.args = { label: 'Hello World' };

export const Disabled = ButtonDemo.bind({});
Disabled.args = { disabled: true, label: 'Hello World' };
