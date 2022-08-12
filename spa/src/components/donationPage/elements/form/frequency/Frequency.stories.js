import * as Yup from 'yup';
import Frequency from './Frequency';
import { RHFFormTemplate } from 'storybook/templates';

const args = {
  component: Frequency,
  name: Frequency.defaultProps.name,
  options: Frequency.defaultProps.options,
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator: Yup.object({})
};

export default {
  title: 'Frequency',
  component: Frequency
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args
};
