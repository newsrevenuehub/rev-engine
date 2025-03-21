import { Meta, StoryObj } from '@storybook/react';
import Progress from './Progress';

const meta: Meta<typeof Progress> = {
  component: Progress,
  title: 'ActiveCampaign Integration/ConnectionModal/Progress'
};

export default meta;

type Story = StoryObj<typeof Progress>;

export const Start: Story = {};
Start.args = {
  currentStep: 1,
  totalSteps: 4
};

export const Middle: Story = {};
Middle.args = {
  currentStep: 2,
  totalSteps: 4
};

export const Finish: Story = {};
Finish.args = {
  currentStep: 4,
  totalSteps: 4
};
