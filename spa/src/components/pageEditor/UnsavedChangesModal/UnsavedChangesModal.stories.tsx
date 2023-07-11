import { ComponentMeta, ComponentStory } from '@storybook/react';
import UnsavedChangesModal from './UnsavedChangesModal';

export default {
  component: UnsavedChangesModal,
  title: 'Page Editor/UnsavedChangesModal'
} as ComponentMeta<typeof UnsavedChangesModal>;

const Template: ComponentStory<typeof UnsavedChangesModal> = (props) => <UnsavedChangesModal {...props} />;

export const Default = Template.bind({});
Default.args = {
  open: true
};
