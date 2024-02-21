import { Meta, StoryObj } from '@storybook/react';
import LoadingSkeleton from './LoadingSkeleton';

const meta: Meta<typeof LoadingSkeleton> = {
  component: LoadingSkeleton,
  title: 'Contributor/LoadingSkeleton'
};

export default meta;

type Story = StoryObj<typeof LoadingSkeleton>;

export const Default: Story = {};
