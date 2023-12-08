import { ComponentMeta, ComponentStory } from '@storybook/react';
import { FormControlLabel } from '../FormControlLabel';
import Radio from '../Radio/Radio';
import RadioGroup from './RadioGroup';

export default {
  component: RadioGroup,
  title: 'Base/RadioGroup'
} as ComponentMeta<typeof RadioGroup>;

const Template: ComponentStory<typeof RadioGroup> = () => (
  <RadioGroup aria-label="Color">
    <FormControlLabel label="Red" value="red" control={<Radio />}></FormControlLabel>
    <FormControlLabel label="Green" value="green" control={<Radio />}></FormControlLabel>
    <FormControlLabel label="Blue" value="blue" control={<Radio />}></FormControlLabel>
  </RadioGroup>
);

export const Default = Template.bind({});
