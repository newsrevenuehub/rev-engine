import * as Yup from 'yup';

import LabeledInput from './LabeledInput';
import { RHFFormTemplate } from 'storybook/templates';
import { ARBITRARY_VALIDATION_ERROR_MESSAGE } from 'storybook/constants';

const textValidator = Yup.string();
const requiredTextValidator = Yup.string().required('This field is required');
const arbitraryError = Yup.string().test('none-shall-pass', ARBITRARY_VALIDATION_ERROR_MESSAGE, () => false);

const args = {
  component: LabeledInput,
  labelText: 'Your biographical detail',
  type: 'text',
  name: 'default-labelled-input',
  required: true,
  submitSuccessMessage: 'successful submit',
  includeDevTools: true,
  validator: requiredTextValidator
};

export default {
  title: 'LabeledInput',
  component: LabeledInput,
  // this prevents circular reference that breaks storybook on form submission
  // https://github.com/storybookjs/storybook/issues/12747
  parameters: { docs: { source: { type: 'code' } } }
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args
};

export const NotRequired = RHFFormTemplate.bind({});
NotRequired.args = {
  ...args,
  required: false,
  name: 'not-required-input',
  validator: textValidator
};

export const HasPlaceholder = RHFFormTemplate.bind({});
HasPlaceholder.args = {
  ...args,
  required: false,
  placeholder: 'Type something here',
  name: 'placeholder-input'
};

export const EmailType = RHFFormTemplate.bind({});
EmailType.args = {
  ...args,
  required: false,
  type: 'email'
};

export const HasDefaultValue = RHFFormTemplate.bind({});
HasDefaultValue.args = {
  ...args,
  required: false,
  prefilledValue: 'pre-filled value',
  name: 'pre-filled-value'
};

export const DoesntValidate = RHFFormTemplate.bind({});
DoesntValidate.args = {
  ...args,
  required: false,
  name: 'doesnt-validate-on-submit',
  validator: arbitraryError
};
