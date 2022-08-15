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
  validator: Yup.object({}),
  defaultValues: { DEFAULT_NAME: '' }
};

export default {
  title: 'LabeledInput',
  component: LabeledInput
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args
};

const notRequiredName = 'not-required-input';
export const NotRequired = RHFFormTemplate.bind({});
NotRequired.args = {
  ...args,
  required: false,
  name: notRequiredName,
  defaultValues: { [notRequiredName]: '' }
};

const hasPlaceholderName = 'placeholder-input';
export const HasPlaceholder = RHFFormTemplate.bind({});
HasPlaceholder.args = {
  ...args,
  required: false,
  placeholder: 'Type something here',
  name: hasPlaceholderName,
  defaultValues: { [hasPlaceholderName]: '' }
};

const hasDefaultValueName = 'pre-filled-value';
const hasDefaultValueValue = 'pre filled value';
export const HasDefaultValue = RHFFormTemplate.bind({});
HasDefaultValue.args = {
  ...args,
  required: false,
  prefilledValue: hasDefaultValueValue,
  name: hasDefaultValueName,
  defaultValues: { [hasDefaultValueName]: hasDefaultValueValue }
};

const DOESNT_VALIDATE_NAME = 'doesnt-validate-on-submit';
export const DoesntValidate = RHFFormTemplate.bind({});
DoesntValidate.args = {
  ...args,
  required: false,
  name: DOESNT_VALIDATE_NAME,
  validator: Yup.object({ [DOESNT_VALIDATE_NAME]: arbitraryError }).required(),
  defaultValues: { [DOESNT_VALIDATE_NAME]: '' }
};
