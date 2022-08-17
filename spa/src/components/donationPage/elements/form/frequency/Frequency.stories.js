import * as Yup from 'yup';
import Frequency from './Frequency';
import { RHFFormTemplate } from 'storybook/templates';

const args = {
  component: Frequency,
  ...Frequency.defaultProps,
  // these come from server in real life
  frequencyOptions: [
    { labelText: 'One-time', value: 'one_time' },
    { labelText: 'Monthly', value: 'monthly' },
    { labelText: 'Yearly', value: 'yearly' }
  ],
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator: Yup.object({}),
  defaultValues: {
    [Frequency.defaultProps.name]:
      Frequency.defaultProps.frequencyOptions[Frequency.defaultProps.defaultCheckedIndex].value
  }
};

export default {
  title: 'Frequency',
  component: Frequency
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args
};
