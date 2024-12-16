import { Meta, StoryFn } from '@storybook/react';
import { FormControlLabel } from '../FormControlLabel';
import Radio from '../Radio/Radio';
import RadioGroup from './RadioGroup';

export default {
  component: RadioGroup,
  title: 'Base/RadioGroup'
} as Meta<typeof RadioGroup>;

const Template: StoryFn<typeof RadioGroup> = () => (
  <RadioGroup aria-label="Color">
    <FormControlLabel label="Red" value="red" control={<Radio />}></FormControlLabel>
    <FormControlLabel label="Green" value="green" control={<Radio />}></FormControlLabel>
    <FormControlLabel label="Blue" value="blue" control={<Radio />}></FormControlLabel>
  </RadioGroup>
);

export const Default = Template.bind({});
