import { Meta, StoryObj } from '@storybook/react';
import UserQuestion from './UserQuestion';

const meta: Meta<typeof UserQuestion> = {
  component: UserQuestion,
  title: 'ActiveCampaign Integration/ConnectionModal/UserQuestion'
};

export default meta;

type Story = StoryObj<typeof UserQuestion>;

export const Default: Story = {};
