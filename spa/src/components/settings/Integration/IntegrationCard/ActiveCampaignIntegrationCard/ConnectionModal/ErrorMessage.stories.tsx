import { Meta, StoryObj } from '@storybook/react';
import ErrorMessage from './ErrorMessage';

const meta: Meta<typeof ErrorMessage> = {
  component: ErrorMessage,
  title: 'ActiveCampaign Integration/ConnectionModal/ErrorMessage'
};

export default meta;

type Story = StoryObj<typeof ErrorMessage>;

export const Default: Story = {};
Default.args = {
  children: 'Error message'
};
