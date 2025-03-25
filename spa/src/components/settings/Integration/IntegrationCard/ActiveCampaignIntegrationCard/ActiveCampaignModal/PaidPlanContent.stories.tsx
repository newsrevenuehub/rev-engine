import { Meta, StoryObj } from '@storybook/react';
import PaidPlanContent from './PaidPlanContent';

const meta: Meta<typeof PaidPlanContent> = {
  component: PaidPlanContent,
  title: 'ActiveCampaign Integration/PaidPlanContent'
};

export default meta;

type Story = StoryObj<typeof PaidPlanContent>;

export const Default: Story = {};
