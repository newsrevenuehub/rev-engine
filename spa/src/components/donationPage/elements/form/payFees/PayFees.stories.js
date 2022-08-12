import * as Yup from 'yup';
import PayFees from './PayFees';
import { RHFFormTemplate } from 'storybook/templates';

const args = {
  ...PayFees.defaultProps,
  labelText: '$3.99 once',
  component: PayFees,
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator: Yup.object({})
};

export default {
  title: 'PayFees',
  component: PayFees
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args
};
