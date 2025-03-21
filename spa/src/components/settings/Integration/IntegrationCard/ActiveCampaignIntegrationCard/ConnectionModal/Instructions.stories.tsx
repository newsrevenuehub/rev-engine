import { Meta, StoryObj } from '@storybook/react';
import Instructions from './Instructions';

const meta: Meta<typeof Instructions> = {
  component: Instructions,
  title: 'ActiveCampaign Integration/ConnectionModal/Instructions'
};

export default meta;

type Story = StoryObj<typeof Instructions>;

export const Default: Story = {};
