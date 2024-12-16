import { Meta, StoryFn } from '@storybook/react';
import DonorAddressEditor from './DonorAddressEditor';

export default {
  component: DonorAddressEditor,
  title: 'ElementEditors/DonorAddressEditor'
} as Meta<typeof DonorAddressEditor>;

const Template: StoryFn<typeof DonorAddressEditor> = (props) => <DonorAddressEditor {...props} />;

export const Default = Template.bind({});
Default.args = {
  elementContent: {}
};
