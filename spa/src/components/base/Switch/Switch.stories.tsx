import { Meta, StoryFn } from '@storybook/react';
import { FormControlLabel } from '../FormControlLabel';
import Switch from './Switch';

export default {
  component: Switch,
  title: 'Base/Switch',
  parameters: {
    docs: {
      description: {
        component: 'A MUI-based switch. See [the API](https://v4.mui.com/api/switch/) for more details.'
      }
    }
  }
} as Meta<typeof Switch>;

const Template: StoryFn<typeof Switch> = () => {
  return (
    <div style={{ display: 'flex', gap: 20, flexDirection: 'column' }}>
      <FormControlLabel
        control={<Switch checked={true} name="Checked" inputProps={{ 'aria-label': 'Checked' }} />}
        label="Checked"
      />
      <FormControlLabel
        control={<Switch checked={false} name="Unchecked" inputProps={{ 'aria-label': 'Unchecked' }} />}
        label="Unchecked"
      />
    </div>
  );
};

export const Small = Template.bind({});
