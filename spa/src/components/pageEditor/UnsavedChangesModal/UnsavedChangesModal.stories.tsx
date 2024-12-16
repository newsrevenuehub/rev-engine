import { Meta, StoryFn } from '@storybook/react';
import UnsavedChangesModal from './UnsavedChangesModal';

export default {
  component: UnsavedChangesModal,
  title: 'Page Editor/UnsavedChangesModal'
} as Meta<typeof UnsavedChangesModal>;

const Template: StoryFn<typeof UnsavedChangesModal> = (props) => <UnsavedChangesModal {...props} />;

export const Default = Template.bind({});
Default.args = {
  open: true
};
