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

export const Error: Story<TextFieldProps> = TextField.bind({});
Error.args = { error: true, helperText: 'This field is required', label: 'First Name', name: 'first-name' };

export const Select: Story<TextFieldProps> = TextField.bind({});
Select.args = {
  children: (
    <>
      <option value="red">Red</option>
      <option value="green">Green</option>
      <option value="blue">Blue</option>
    </>
  ),
  label: 'Color',
  name: 'color',
  select: true
};

export const SelectError: Story<TextFieldProps> = TextField.bind({});
Select.args = {
  children: (
    <>
      <option value="red">Red</option>
      <option value="green">Green</option>
      <option value="blue">Blue</option>
    </>
  ),
  error: true,
  helperText: 'This field is required',
  label: 'Color',
  name: 'color',
  select: true
};
