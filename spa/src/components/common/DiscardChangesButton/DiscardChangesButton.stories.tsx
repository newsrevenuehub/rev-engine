import { Meta, StoryObj } from '@storybook/react';
import DiscardChangesButton from './DiscardChangesButton';

const meta: Meta<typeof DiscardChangesButton> = {
  component: DiscardChangesButton,
  title: 'Common/DiscardChangesButton/DiscardChangesButton'
};

export default meta;

type Story = StoryObj<typeof DiscardChangesButton>;

export const Default: Story = {};
Default.args = {
  children: 'Exit',
  changesPending: true
};
