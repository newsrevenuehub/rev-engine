import { ComponentMeta, ComponentStory } from '@storybook/react';
import DonorAddressEditor from './DonorAddressEditor';

export default {
  component: DonorAddressEditor,
  title: 'ElementEditors/DonorAddressEditor'
} as ComponentMeta<typeof DonorAddressEditor>;

const Template: ComponentStory<typeof DonorAddressEditor> = (props) => <DonorAddressEditor {...props} />;

export const Default = Template.bind({});
Default.args = {
  elementContent: {}
};
