import { Meta, StoryObj } from '@storybook/react';
import Connected from './Connected';

const meta: Meta<typeof Connected> = {
  component: Connected,
  title: 'ActiveCampaign Integration/ConnectionModal/Connected'
};

export default meta;

type Story = StoryObj<typeof Connected>;

export const Default: Story = {};
