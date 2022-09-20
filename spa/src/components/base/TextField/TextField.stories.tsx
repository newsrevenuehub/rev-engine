import { Meta, Story } from '@storybook/react';
import TextField, { TextFieldProps } from './TextField';

export default {
  component: TextField,
  title: 'Base/TextField',
  parameters: {
    docs: {
      description: {
        component: 'A MUI-based text field. See [the API](https://v4.mui.com/api/text-field/) for more details.'
      }
    }
  }
} as Meta;

export const Default: Story<TextFieldProps> = TextField.bind({});
Default.args = { label: 'First Name', name: 'first-name' };
