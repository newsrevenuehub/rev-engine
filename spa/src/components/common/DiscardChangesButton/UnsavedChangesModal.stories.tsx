import { Meta, StoryObj } from '@storybook/react';
import UnsavedChangesModal from './UnsavedChangesModal';

const meta: Meta<typeof UnsavedChangesModal> = {
  component: UnsavedChangesModal,
  title: 'Common/DiscardChangesButton/UnsavedChangesModal'
};

export default meta;

type Story = StoryObj<typeof UnsavedChangesModal>;

export const Default: Story = {};
Default.args = { open: true };
