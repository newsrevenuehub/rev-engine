import * as Yup from 'yup';

import Address from './Address';
import { RHFFormTemplate } from 'storybook/templates';

const args = {
  component: Address,
  name: 'address-input',
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator: Yup.object({})
};

export default {
  title: 'Address',
  component: Address
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args
};
