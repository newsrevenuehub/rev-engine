import * as Yup from 'yup';

import Swag from './Swag';
import { RHFFormTemplate } from 'storybook/templates';

const args = {
  component: Swag,
  ...Swag.defaultProps,
  thresholdAmount: '$250',
  optOutDefaultChecked: false,
  swagItemLabelText: 'T-shirt',
  swagItemOptions: [
    { value: 'sm', labelText: 'sm' },
    { value: 'med', labelText: 'med' },
    { value: 'lg', labelText: 'lg' },
    { value: 'xl', labelText: 'xl' }
  ],
  thresholdMet: true,
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator: Yup.object({})
};

export default {
  title: 'Swag',
  component: Swag
};

export const Default = RHFFormTemplate.bind({});
Default.args = {
  ...args
};

export const ThresholdNotMet = RHFFormTemplate.bind({});
ThresholdNotMet.args = {
  ...Default.args,
  thresholdMet: false
};

export const OptOutDefaultChecked = RHFFormTemplate.bind({});
OptOutDefaultChecked.args = {
  ...Default.args,
  optOutDefaultChecked: true
};
