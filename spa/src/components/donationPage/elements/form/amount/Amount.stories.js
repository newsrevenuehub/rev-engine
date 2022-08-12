import * as Yup from 'yup';

import Amount from './Amount';
import { RHFFormTemplate } from 'storybook/templates';
import validator from './validator';

const args = {
  component: Amount,
  ...Amount.defaultProps,
  labelText: 'Amount',
  amountFrequency: 'month',
  presetAmounts: [100, 200, 300],
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator: Yup.object({ [Amount.defaultProps.name]: validator }).required()
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
  amountFrequency: '',
  name: 'one-time-amount',
  validator: Yup.object({ 'one-time-amount': validator }).required()
};

export const WithDefaultFreeForm = RHFFormTemplate.bind({});
WithDefaultFreeForm.args = {
  ...args,
  defaultValue: 12.37,
  name: 'default-set-amount',
  validator: Yup.object({ 'default-set-amount': validator }).required()
};

export const FreeFormInputDisabled = RHFFormTemplate.bind({});
FreeFormInputDisabled.args = {
  ...args,
  allowUserSetValue: false,
  name: 'free-form-disabled-amount',
  validator: Yup.object({ 'free-form-disabled-amount': validator }).required()
};
