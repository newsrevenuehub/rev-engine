import { Meta, StoryObj } from '@storybook/react';
import FreePlanContent from './FreePlanContent';

const meta: Meta<typeof FreePlanContent> = {
  component: FreePlanContent,
  title: 'ActiveCampaign Integration/FreePlanContent'
};

export default meta;

type Story = StoryObj<typeof FreePlanContent>;

export const Default: Story = {};
