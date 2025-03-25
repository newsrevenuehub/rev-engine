import { Meta, StoryObj } from '@storybook/react';
import UserNeeded from './UserNeeded';

const meta: Meta<typeof UserNeeded> = {
  component: UserNeeded,
  title: 'ActiveCampaign Integration/ConnectionModal/UserNeeded'
};

export default meta;

type Story = StoryObj<typeof UserNeeded>;

export const Default: Story = {};
