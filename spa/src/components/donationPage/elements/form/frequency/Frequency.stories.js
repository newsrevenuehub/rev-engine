import * as Yup from 'yup';
import Frequency from './Frequency';
import { RHFFormTemplate } from 'storybook/templates';

export const frequencyOptions = [
  { displayName: 'One-time', value: 'one_time' },
  { displayName: 'Monthly', value: 'monthly' },
  { displayName: 'Yearly', value: 'yearly' }
];

const args = {
  component: Frequency,
  ...Frequency.defaultProps,
  // these come from server in real life
  frequencyOptions,
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator: Yup.object({}),
  defaultValues: {
    [Frequency.defaultProps.name]: frequencyOptions[0].value
  }
};

export default {
  title: 'Frequency',
  component: Frequency,
  excludeStories: ['frequencyOptions']
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args
};
