import * as Yup from 'yup';
import TributeRadio from './TributeRadio';
import { RHFFormTemplate } from 'storybook/templates';

const args = {
  ...TributeRadio.defaultProps,
  component: TributeRadio,
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator: Yup.object({})
};

export default {
  title: 'TributeRadio',
  component: TributeRadio
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args,
  inHonorOfDisplay: true,
  inMemoryOfDisplay: true
};
