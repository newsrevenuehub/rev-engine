import { ComponentMeta, ComponentStory } from '@storybook/react';
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
} as ComponentMeta<typeof Switch>;

const Template: ComponentStory<typeof Switch> = () => {
  return (
    <div style={{ display: 'flex', gap: 20, flexDirection: 'column' }}>
      <FormControlLabel
        control={<Switch checked={true} name="checkedA" inputProps={{ 'aria-label': 'checkboxA' }} />}
        label="Checkbox A"
      />
      <FormControlLabel
        control={<Switch checked={false} name="checkedB" inputProps={{ 'aria-label': 'checkboxB' }} />}
        label="Checkbox B"
      />
    </div>
  );
};

export const Small = Template.bind({});
