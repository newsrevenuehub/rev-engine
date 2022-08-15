import * as Yup from 'yup';

import Reason from './Reason';
import TributeRadio from './TributeRadio';
import { RHFFormTemplate } from 'storybook/templates';

const args = {
  ...Reason.defaultProps,
  reasonPromptOptions: [
    { labelText: 'Reason 1', value: 'reason1UID' },
    { labelText: 'Reason 2', value: 'reason2UID' }
  ],
  reasonPromptDisplay: true,
  inMemoryDisplay: true,
  component: Reason,
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator: Yup.object({}),
  defaultValues: {
    [Reason.defaultProps.reasonPromptName]: undefined,
    [TributeRadio.defaultProps.name]: TributeRadio.defaultProps.noValue,
    [Reason.defaultProps.inMemoryName]: '',
    [Reason.defaultProps.inHonorName]: ''
  }
};

export default {
  title: 'Reason',
  component: Reason
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args
};
