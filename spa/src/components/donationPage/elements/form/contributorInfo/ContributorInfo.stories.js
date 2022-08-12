import * as Yup from 'yup';

import ContributorInfo from './ContributorInfo';
import { RHFFormTemplate } from 'storybook/templates';
import validator from './validator';
import { defaultArgs } from './ContributorInfo';

const NAME = 'contributor-info';
const args = {
  component: ContributorInfo,
  name: NAME,
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator: Yup.object({ [defaultArgs.emailInputName]: validator }).required()
};

export default {
  title: 'ContributorInfo',
  component: ContributorInfo
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args
};
