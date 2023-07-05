import { ComponentMeta, ComponentStory } from '@storybook/react';
import UnpublishModal from './UnpublishModal';

export default {
  component: UnpublishModal,
  title: 'Common/Modal/UnpublishModal'
} as ComponentMeta<typeof UnpublishModal>;

const Template: ComponentStory<typeof UnpublishModal> = (props) => <UnpublishModal {...props} />;

export const Default = Template.bind({});
Default.args = {
  open: true,
  page: { id: 'mock-id', name: 'Page Name', revenue_program: {} } as any
};

export const PageIsDefault = Template.bind({});
PageIsDefault.args = {
  open: true,
  page: { id: 'mock-id', name: 'Page Name', revenue_program: { default_donation_page: 'mock-id' } } as any
};
