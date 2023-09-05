import { ComponentMeta, ComponentStory } from '@storybook/react';
import PublishModal from './PublishModal';

export default {
  component: PublishModal,
  title: 'Common/Modal/PublishModal'
} as ComponentMeta<typeof PublishModal>;

const Template: ComponentStory<typeof PublishModal> = (props) => <PublishModal {...props} />;

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
