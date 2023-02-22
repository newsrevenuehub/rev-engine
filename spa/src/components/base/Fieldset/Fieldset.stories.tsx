import { ComponentMeta, ComponentStory } from '@storybook/react';
import TextField from '../TextField/TextField';
import Fieldset from './Fieldset';

export default {
  component: Fieldset,
  title: 'Base/Fieldset'
} as ComponentMeta<typeof Fieldset>;

const Template: ComponentStory<typeof Fieldset> = (props) => <Fieldset {...props} />;

export const Default = Template.bind({});
Default.args = {
  label: 'Label',
  children: (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <TextField label="First Name" />
      <TextField label="Last Name" />
    </div>
  )
};
