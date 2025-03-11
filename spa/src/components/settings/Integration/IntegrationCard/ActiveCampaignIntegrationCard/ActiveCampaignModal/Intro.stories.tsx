import { Meta, StoryObj } from '@storybook/react';
import Intro from './Intro';

const meta: Meta<typeof Intro> = {
  component: Intro,
  title: 'ActiveCampaign Integration/Intro'
};

export default meta;

type Story = StoryObj<typeof Intro>;

export const Default: Story = {};
