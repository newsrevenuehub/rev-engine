import MenuItem from '../MenuItem/MenuItem';
import TextField from './TextField';

// Not sure why we need this indirection, but if we use TextField directly
// stories don't show up.
const TextFieldDemo = (props) => <TextField {...props} />;

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
};

export const Default = TextFieldDemo.bind({});
Default.args = { label: 'First Name', name: 'first-name' };

export const Error = TextFieldDemo.bind({});
Error.args = { error: true, helperText: 'This field is required', label: 'First Name', name: 'first-name' };

export const Select = TextFieldDemo.bind({});
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

export const SelectError = TextFieldDemo.bind({});
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
