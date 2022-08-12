import * as Yup from 'yup';

import Amount from './Amount';
import validator from './validator';
import { RHFFormTemplate } from 'storybook/templates';
import { INPUT_NAME as DEFAULT_NAME } from './constants';

const DEFAULT_AMOUNT = 0;

const args = {
  component: Amount,
  labelText: 'Monthly amount',
  amountFrequency: 'month',
  amountCurrencySymbol: '$',
  presetAmounts: [100, 200, 300],
  defaultValue: DEFAULT_AMOUNT,
  allowUserSetValue: true,
  helperText: "Select how much you'd like to contribute",
  name: DEFAULT_NAME,
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator: Yup.object({})
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
  labelText: 'Amount',
  amountFrequency: '',
  name: 'one-time-amount'
};

export const WithDefaultFreeForm = RHFFormTemplate.bind({});
WithDefaultFreeForm.args = {
  ...args,
  defaultValue: 12.37,
  name: 'default-set-amount'
};

export const FreeFormInputDisabled = RHFFormTemplate.bind({});
FreeFormInputDisabled.args = {
  ...args,
  allowUserSetValue: false,
  name: 'free-form-disabled-amount'
};
