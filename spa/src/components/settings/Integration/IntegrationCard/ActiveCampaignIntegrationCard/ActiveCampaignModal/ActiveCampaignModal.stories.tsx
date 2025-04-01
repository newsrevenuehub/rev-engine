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

export const Core: Story = {};
Core.args = {
  open: true,
  orgPlan: 'CORE'
};

export const Plus: Story = {};
Plus.args = {
  open: true,
  orgPlan: 'PLUS'
};

export const Connected: Story = {};
Connected.args = {
  connected: true,
  open: true,
  orgPlan: 'CORE'
};
