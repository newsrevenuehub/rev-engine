import * as Yup from 'yup';

import ContributorInfo from './ContributorInfo';
import { RHFFormTemplate } from 'storybook/templates';
import validator from './validator';

const NAME = 'contributor-info';
const args = {
  askPhone: false,
  component: ContributorInfo,
  name: NAME,
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator: Yup.object({
    [ContributorInfo.defaultProps.emailInputName]: validator
  }).required()
};

export default {
  title: 'ContributorInfo',
  component: ContributorInfo
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args
};

export const AskPhone = RHFFormTemplate.bind({});
AskPhone.args = {
  ...args,
  askPhone: true,
  phoneRequired: true
};
