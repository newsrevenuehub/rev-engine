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
  validator
};

const ONE_TIME_NAME = 'one-time-amount';
const oneTime = {
  ...args,
  labelText: 'Amount',
  amountFrequency: '',
  // each need a unique name property for storybook to work
  name: ONE_TIME_NAME
};

const DEFAULT_USER_SET_VALUE_NAME = 'default-set-amount';
const defaultUserSetValue = {
  ...args,
  defaultValue: 12.37,
  name: DEFAULT_USER_SET_VALUE_NAME
};

const FREE_FORM_DISABLED_NAME = 'free-form-disabled-amount';
const freeFormDisabled = {
  ...args,
  allowUserSetValue: false,
  name: FREE_FORM_DISABLED_NAME
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
  ...oneTime
};

export const WithDefaultFreeForm = RHFFormTemplate.bind({});
WithDefaultFreeForm.args = {
  ...defaultUserSetValue
};

export const FreeFormInputDisabled = RHFFormTemplate.bind({});
FreeFormInputDisabled.args = {
  ...freeFormDisabled
};
