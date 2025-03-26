import { Meta, StoryObj } from '@storybook/react';
import EnterApiKey from './EnterApiKey';

const meta: Meta<typeof EnterApiKey> = {
  component: EnterApiKey,
  title: 'ActiveCampaign Integration/ConnectionModal/EnterApiKey'
};

export default meta;

type Story = StoryObj<typeof EnterApiKey>;

export const Default: Story = {};
