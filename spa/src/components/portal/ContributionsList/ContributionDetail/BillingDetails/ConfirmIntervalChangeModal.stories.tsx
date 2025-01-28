import { Meta, StoryObj } from '@storybook/react';
import ConfirmIntervalChangeModal from './ConfirmIntervalChangeModal';

const meta: Meta<typeof ConfirmIntervalChangeModal> = {
  component: ConfirmIntervalChangeModal,
  title: 'Contributor/ConfirmIntervalChangeModal'
};

export default meta;

type Story = StoryObj<typeof ConfirmIntervalChangeModal>;

export const Default: Story = {};

Default.args = { open: true };
