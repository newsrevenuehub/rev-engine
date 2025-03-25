import { Meta, StoryObj } from '@storybook/react';
import CreateUser from './CreateUser';

const meta: Meta<typeof CreateUser> = {
  component: CreateUser,
  title: 'ActiveCampaign Integration/ConnectionModal/CreateUser'
};

export default meta;

type Story = StoryObj<typeof CreateUser>;

export const Default: Story = {};
