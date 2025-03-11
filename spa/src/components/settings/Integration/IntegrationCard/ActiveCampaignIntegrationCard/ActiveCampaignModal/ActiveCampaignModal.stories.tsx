import { Meta, StoryObj } from '@storybook/react';
import ActiveCampaignModal from './ActiveCampaignModal';

const meta: Meta<typeof ActiveCampaignModal> = {
  component: ActiveCampaignModal,
  title: 'ActiveCampaign Integration/ActiveCampaignModal'
};

export default meta;

type Story = StoryObj<typeof ActiveCampaignModal>;

export const Free: Story = {};
Free.args = {
  open: true,
  orgPlan: 'FREE'
};
