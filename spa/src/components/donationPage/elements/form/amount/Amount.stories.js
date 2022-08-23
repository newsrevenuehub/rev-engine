import * as Yup from 'yup';

import Amount from './Amount';
import { RHFFormTemplate } from 'storybook/templates';
import { rawValidationSchema } from '../schema';

const args = {
  component: Amount,
  ...Amount.defaultProps,
  labelText: 'Amount',
  frequencyString: 'month',
  presetAmounts: [100, 200, 300],
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator: Yup.object({ [Amount.defaultProps.name]: rawValidationSchema[Amount.defaultProps.name] }).required()
};

export default {
  title: 'Amount',
  component: Amount
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args
};

export const OneTime = RHFFormTemplate.bind({});
OneTime.args = {
  ...args,
  frequencyString: '',
  // between using RHF and Storybook, we need to have each template version of this component have a different
  // name, and then we need the validator to point to that name. Otherwise, the form submission doesn't work right
  // in SB.
  name: 'one-time-amount',
  validator: Yup.object({ 'one-time-amount': rawValidationSchema[Amount.defaultProps.name] }).required()
};

export const WithDefaultFreeForm = RHFFormTemplate.bind({});
WithDefaultFreeForm.args = {
  ...args,
  defaultAmount: 12.37,
  name: 'default-set-amount',
  validator: Yup.object({ 'default-set-amount': rawValidationSchema[Amount.defaultProps.name] }).required()
};

export const FreeFormInputDisabled = RHFFormTemplate.bind({});
FreeFormInputDisabled.args = {
  ...args,
  allowUserSetValue: false,
  name: 'free-form-disabled-amount',
  validator: Yup.object({ 'free-form-disabled-amount': rawValidationSchema[Amount.defaultProps.name] }).required()
};
