import { Meta, StoryFn } from '@storybook/react';
import MenuItem from '../MenuItem/MenuItem';
import TextField from './TextField';

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
} as Meta<typeof TextField>;

const Template: StoryFn<typeof TextField> = (props) => <TextField {...props} />;

export const Default = Template.bind({});
Default.args = { label: 'First Name', name: 'first-name' };

export const Error = Template.bind({});
Error.args = { error: true, helperText: 'This field is required', label: 'First Name', name: 'first-name' };

export const Select = Template.bind({});
Select.args = {
  children: (
    <>
      <MenuItem value="red">Red</MenuItem>
      <MenuItem value="green">Green</MenuItem>
      <MenuItem value="blue">Blue</MenuItem>
    </>
  ),
  label: 'Color',
  name: 'color',
  select: true
};

export const SelectError = Template.bind({});
SelectError.args = {
  children: (
    <>
      <MenuItem value="red">Red</MenuItem>
      <MenuItem value="green">Green</MenuItem>
      <MenuItem value="blue">Blue</MenuItem>
    </>
  ),
  error: true,
  helperText: 'This field is required',
  label: 'Color',
  name: 'color',
  select: true
};
