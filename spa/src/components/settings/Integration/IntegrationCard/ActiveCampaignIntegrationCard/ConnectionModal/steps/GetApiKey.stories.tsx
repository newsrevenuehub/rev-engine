import { Meta, StoryObj } from '@storybook/react';
import GetApiKey from './GetApiKey';

const meta: Meta<typeof GetApiKey> = {
  component: GetApiKey,
  title: 'ActiveCampaign Integration/ConnectionModal/GetApiKey'
};

export default meta;

type Story = StoryObj<typeof GetApiKey>;

export const Default: Story = {};
