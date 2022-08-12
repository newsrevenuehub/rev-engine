import * as Yup from 'yup';

import LabeledInput from './LabeledInput';
import { RHFFormTemplate } from 'storybook/templates';
import { ARBITRARY_VALIDATION_ERROR_MESSAGE } from 'storybook/constants';

const arbitraryError = Yup.string().test('none-shall-pass', ARBITRARY_VALIDATION_ERROR_MESSAGE, () => false);

const DEFAULT_NAME = 'default-labelled-input';
const args = {
  component: LabeledInput,
  ...LabeledInput.defaultProps,
  labelText: 'Your biographical detail',
  type: 'text',
  name: DEFAULT_NAME,
  required: true,
  submitSuccessMessage: 'successful submit',
  includeDevTools: true,
  validator: Yup.object({})
};

export default {
  title: 'LabeledInput',
  component: LabeledInput
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args
};

export const NotRequired = RHFFormTemplate.bind({});
NotRequired.args = {
  ...args,
  required: false,
  name: 'not-required-input'
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

const DOESNT_VALIDATE_NAME = 'doesnt-validate-on-submit';
export const DoesntValidate = RHFFormTemplate.bind({});
DoesntValidate.args = {
  ...args,
  required: false,
  name: DOESNT_VALIDATE_NAME,
  validator: Yup.object({ [DOESNT_VALIDATE_NAME]: arbitraryError }).required()
};
